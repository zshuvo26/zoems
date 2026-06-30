package com.demo.oms.service;

import com.demo.oms.domain.*;
import com.demo.oms.enums.CorporateActionType;
import com.demo.oms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CorporateActionService {

    private final CorporateActionRepository caRepository;
    private final PositionRepository positionRepository;
    private final AccountRepository accountRepository;
    private final InstrumentRepository instrumentRepository;
    private final NotificationService notificationService;

    public CorporateAction create(CorporateAction ca) {
        return caRepository.save(ca);
    }

    public List<CorporateAction> getAll() {
        return caRepository.findAllByOrderByExDateDesc();
    }

    public List<CorporateAction> getBySymbol(String symbol) {
        return caRepository.findBySymbolOrderByExDateDesc(symbol);
    }

    public List<CorporateAction> getUpcoming(int days) {
        LocalDate from = LocalDate.now();
        LocalDate to   = from.plusDays(days);
        return caRepository.findByExDateBetweenOrderByExDateAsc(from, to);
    }

    /**
     * Process all unprocessed corporate actions whose ex-date has passed.
     * Called by MarketScheduler at market open.
     */
    @Transactional
    public void processMatureCorporateActions() {
        List<CorporateAction> pending = caRepository.findByProcessedFalseAndExDateLessThanEqual(LocalDate.now());
        for (CorporateAction ca : pending) {
            try {
                applyCorporateAction(ca);
                ca.setProcessed(true);
                ca.setProcessedAt(LocalDateTime.now());
                caRepository.save(ca);
                log.info("Processed corporate action {} {} for {}", ca.getType(), ca.getId(), ca.getSymbol());
            } catch (Exception e) {
                log.error("Failed to process corporate action {} for {}: {}", ca.getId(), ca.getSymbol(), e.getMessage());
            }
        }
    }

    @Transactional
    public void applyCorporateAction(UUID caId) {
        CorporateAction ca = caRepository.findById(caId)
                .orElseThrow(() -> new com.demo.oms.exception.OmsException("NOT_FOUND", "Corporate action not found"));
        if (ca.isProcessed()) throw new com.demo.oms.exception.OmsException("ALREADY_PROCESSED", "Already applied");
        applyCorporateAction(ca);
        ca.setProcessed(true);
        ca.setProcessedAt(LocalDateTime.now());
        caRepository.save(ca);
    }

    private void applyCorporateAction(CorporateAction ca) {
        String exchange = ca.getExchange() != null ? ca.getExchange().name() : "DSE";

        List<Position> positions = positionRepository.findBySymbolAndExchange(ca.getSymbol(), exchange);

        for (Position pos : positions) {
            if (pos.getNetQuantity().compareTo(BigDecimal.ZERO) <= 0) continue;

            switch (ca.getType()) {
                case CASH_DIVIDEND     -> applyCashDividend(pos, ca);
                case STOCK_DIVIDEND    -> applyStockDividend(pos, ca);
                case BONUS_SHARE       -> applyBonusShare(pos, ca);
                case STOCK_SPLIT       -> applyStockSplit(pos, ca);
                case REVERSE_SPLIT     -> applyReverseSplit(pos, ca);
                default -> log.warn("Corporate action type {} not auto-applied for {}", ca.getType(), ca.getSymbol());
            }

            positionRepository.save(pos);

            String description = buildDescription(ca, pos);
            notificationService.notifyCorporateAction(pos.getAccountId(), ca.getSymbol(), description);
        }

        // Also adjust instrument prevClose for splits
        if (ca.getType() == CorporateActionType.STOCK_SPLIT && ca.getRatio() != null) {
            instrumentRepository.findById(ca.getSymbol()).ifPresent(inst -> {
                if (inst.getPreviousClose() != null) {
                    inst.setPreviousClose(inst.getPreviousClose().divide(ca.getRatio(), 4, RoundingMode.HALF_UP));
                }
                instrumentRepository.save(inst);
            });
        }
    }

    private void applyCashDividend(Position pos, CorporateAction ca) {
        BigDecimal dividendAmount = ca.getRatio().multiply(pos.getNetQuantity()).setScale(2, RoundingMode.HALF_UP);
        accountRepository.findById(pos.getAccountId()).ifPresent(acc -> {
            acc.setCashBalance(acc.getCashBalance().add(dividendAmount));
            acc.setAvailableFunds(acc.getCashBalance().subtract(acc.getBlockedAmount()));
            accountRepository.save(acc);
            log.info("Cash dividend BDT {} credited to account {} for {}", dividendAmount, pos.getAccountId(), ca.getSymbol());
        });
    }

    private void applyStockDividend(Position pos, CorporateAction ca) {
        BigDecimal newShares = pos.getNetQuantity().multiply(ca.getRatio()).setScale(0, RoundingMode.DOWN);
        addSharesToPosition(pos, newShares, BigDecimal.ZERO); // bonus shares at zero cost
    }

    private void applyBonusShare(Position pos, CorporateAction ca) {
        BigDecimal newShares = pos.getNetQuantity().multiply(ca.getRatio()).setScale(0, RoundingMode.DOWN);
        addSharesToPosition(pos, newShares, BigDecimal.ZERO);
    }

    private void applyStockSplit(Position pos, CorporateAction ca) {
        BigDecimal newQty = pos.getNetQuantity().multiply(ca.getRatio()).setScale(0, RoundingMode.DOWN);
        BigDecimal newAvgCost = pos.getAvgCostPrice() != null
                ? pos.getAvgCostPrice().divide(ca.getRatio(), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        pos.setNetQuantity(newQty);
        pos.setLongQuantity(newQty);
        pos.setAvgCostPrice(newAvgCost);
        pos.setCostBasis(newAvgCost.multiply(newQty).setScale(2, RoundingMode.HALF_UP));
    }

    private void applyReverseSplit(Position pos, CorporateAction ca) {
        BigDecimal newQty = pos.getNetQuantity().divide(ca.getRatio(), 0, RoundingMode.DOWN);
        BigDecimal newAvgCost = pos.getAvgCostPrice() != null
                ? pos.getAvgCostPrice().multiply(ca.getRatio()).setScale(4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        pos.setNetQuantity(newQty);
        pos.setLongQuantity(newQty);
        pos.setAvgCostPrice(newAvgCost);
        pos.setCostBasis(newAvgCost.multiply(newQty).setScale(2, RoundingMode.HALF_UP));
    }

    private void addSharesToPosition(Position pos, BigDecimal newShares, BigDecimal costPerShare) {
        BigDecimal totalOldCost = pos.getCostBasis() != null ? pos.getCostBasis() : BigDecimal.ZERO;
        BigDecimal totalNewCost = costPerShare.multiply(newShares);
        BigDecimal totalQty = pos.getNetQuantity().add(newShares);
        BigDecimal newAvgCost = totalQty.compareTo(BigDecimal.ZERO) > 0
                ? totalOldCost.add(totalNewCost).divide(totalQty, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        pos.setNetQuantity(totalQty);
        pos.setLongQuantity(totalQty);
        pos.setAvgCostPrice(newAvgCost);
        pos.setCostBasis(newAvgCost.multiply(totalQty).setScale(2, RoundingMode.HALF_UP));
    }

    private String buildDescription(CorporateAction ca, Position pos) {
        return switch (ca.getType()) {
            case CASH_DIVIDEND -> String.format("Cash dividend BDT %.2f/share credited for %.0f shares of %s",
                    ca.getRatio(), pos.getNetQuantity(), ca.getSymbol());
            case BONUS_SHARE, STOCK_DIVIDEND -> String.format("Bonus/stock dividend: %.0f%% new shares added for %s",
                    ca.getRatio().multiply(BigDecimal.valueOf(100)), ca.getSymbol());
            case STOCK_SPLIT -> String.format("Stock split %.1f:1 applied for %s — shares multiplied",
                    ca.getRatio(), ca.getSymbol());
            case REVERSE_SPLIT -> String.format("Reverse split 1:%.1f applied for %s — shares consolidated",
                    ca.getRatio(), ca.getSymbol());
            default -> ca.getDescription() != null ? ca.getDescription() : ca.getType().name() + " processed for " + ca.getSymbol();
        };
    }
}
