package com.demo.oms.service;

import com.demo.oms.domain.Position;
import com.demo.oms.domain.Trade;
import com.demo.oms.dto.PortfolioResponse;
import com.demo.oms.dto.PositionResponse;
import com.demo.oms.repository.AccountRepository;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.PositionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PositionService {

    @Autowired private PositionRepository positionRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private InstrumentRepository instrumentRepository;

    @Transactional
    public void applyTrade(Trade trade) {
        String exchange = trade.getExchange();
        Optional<Position> existing = positionRepository
                .findByAccountIdAndSymbolAndExchange(trade.getAccountId(), trade.getSymbol(), exchange);

        Position pos = existing.orElseGet(() -> {
            Position p = new Position();
            p.setAccountId(trade.getAccountId());
            p.setSymbol(trade.getSymbol());
            p.setExchange(exchange);
            return p;
        });

        boolean isBuy = "BUY".equalsIgnoreCase(trade.getSide());

        if (isBuy) {
            BigDecimal totalCost = pos.getCostBasis().add(trade.getGrossValue());
            BigDecimal totalQty  = pos.getLongQuantity().add(trade.getQuantity());
            pos.setLongQuantity(totalQty);
            pos.setNetQuantity(pos.getLongQuantity().subtract(pos.getShortQuantity()));
            pos.setCostBasis(totalCost);
            if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
                pos.setAvgCostPrice(totalCost.divide(totalQty, 4, RoundingMode.HALF_UP));
            }
        } else {
            // SELL: realize P&L
            BigDecimal soldQty = trade.getQuantity().min(pos.getLongQuantity());
            BigDecimal costOfSold = pos.getAvgCostPrice().multiply(soldQty);
            BigDecimal realizedGain = trade.getGrossValue().subtract(costOfSold);
            pos.setRealizedPnL(pos.getRealizedPnL().add(realizedGain));
            pos.setLongQuantity(pos.getLongQuantity().subtract(soldQty));
            pos.setNetQuantity(pos.getLongQuantity().subtract(pos.getShortQuantity()));
            pos.setCostBasis(pos.getAvgCostPrice().multiply(pos.getLongQuantity()));
        }

        pos.setCurrentMarketPrice(trade.getPrice());
        pos.setMarketValue(pos.getNetQuantity().multiply(trade.getPrice()));
        recalcUnrealizedPnL(pos);
        pos.setTotalPnL(pos.getUnrealizedPnL().add(pos.getRealizedPnL()));
        pos.setLastUpdated(LocalDateTime.now());

        positionRepository.save(pos);
        refreshAccountPortfolioValue(trade.getAccountId());
    }

    @Transactional
    public void markToMarket(String accountId) {
        List<Position> positions = positionRepository.findByAccountId(accountId);
        for (Position pos : positions) {
            instrumentRepository.findById(pos.getSymbol()).ifPresent(inst -> {
                if (inst.getLastPrice() != null && inst.getLastPrice().compareTo(BigDecimal.ZERO) > 0) {
                    pos.setCurrentMarketPrice(inst.getLastPrice());
                    pos.setMarketValue(pos.getNetQuantity().multiply(inst.getLastPrice()));
                    recalcUnrealizedPnL(pos);
                    pos.setTotalPnL(pos.getUnrealizedPnL().add(pos.getRealizedPnL()));
                    if (inst.getPreviousClose() != null) {
                        pos.setDayPnL(pos.getNetQuantity().multiply(
                                inst.getLastPrice().subtract(inst.getPreviousClose())));
                    }
                    pos.setLastUpdated(LocalDateTime.now());
                    positionRepository.save(pos);
                }
            });
        }
        refreshAccountPortfolioValue(accountId);
    }

    private void recalcUnrealizedPnL(Position pos) {
        if (pos.getNetQuantity().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal unrealized = pos.getMarketValue().subtract(pos.getCostBasis());
            pos.setUnrealizedPnL(unrealized);
            if (pos.getCostBasis().compareTo(BigDecimal.ZERO) > 0) {
                pos.setUnrealizedPnLPct(unrealized.divide(pos.getCostBasis(), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)));
            }
        } else {
            pos.setUnrealizedPnL(BigDecimal.ZERO);
            pos.setUnrealizedPnLPct(BigDecimal.ZERO);
        }
    }

    private void refreshAccountPortfolioValue(String accountId) {
        BigDecimal portfolioValue = positionRepository.sumPortfolioValue(accountId);
        BigDecimal unrealizedPnL = positionRepository.sumUnrealizedPnL(accountId);
        accountRepository.findById(accountId).ifPresent(acc -> {
            acc.setPortfolioValue(portfolioValue);
            acc.setTotalEquity(acc.getAvailableFunds().add(portfolioValue));
            accountRepository.save(acc);
        });
    }

    public PortfolioResponse getPortfolio(String accountId) {
        List<Position> positions = positionRepository.findActivePositionsByAccount(accountId);

        PortfolioResponse resp = new PortfolioResponse();
        resp.setAccountId(accountId);

        accountRepository.findById(accountId).ifPresent(acc -> {
            resp.setCashBalance(acc.getCashBalance());
            resp.setPortfolioValue(acc.getPortfolioValue());
            resp.setTotalEquity(acc.getTotalEquity());
            resp.setDayPnL(acc.getDayPnL());
        });

        List<PositionResponse> posResp = positions.stream().map(this::toResponse).collect(Collectors.toList());
        resp.setPositions(posResp);

        BigDecimal unrealized = positions.stream()
                .map(Position::getUnrealizedPnL).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal realized = positions.stream()
                .map(Position::getRealizedPnL).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = positions.stream()
                .map(Position::getCostBasis).reduce(BigDecimal.ZERO, BigDecimal::add);
        resp.setTotalUnrealizedPnL(unrealized);
        resp.setTotalRealizedPnL(realized);
        BigDecimal totalPnL = unrealized.add(realized);
        resp.setTotalPnL(totalPnL);
        if (totalCost.compareTo(BigDecimal.ZERO) > 0) {
            resp.setTotalPnlPct(totalPnL.divide(totalCost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)));
        }
        BigDecimal dayPnL = resp.getDayPnL() != null ? resp.getDayPnL() : BigDecimal.ZERO;
        BigDecimal prevEquity = resp.getTotalEquity() != null
                ? resp.getTotalEquity().subtract(dayPnL) : BigDecimal.ZERO;
        if (prevEquity.compareTo(BigDecimal.ZERO) > 0) {
            resp.setDayPnlPct(dayPnL.divide(prevEquity, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)));
        }
        resp.setAsOf(LocalDateTime.now());
        return resp;
    }

    public List<PositionResponse> getPositions(String accountId) {
        return positionRepository.findByAccountId(accountId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    private PositionResponse toResponse(Position p) {
        PositionResponse r = new PositionResponse();
        r.setId(p.getId());
        r.setAccountId(p.getAccountId());
        r.setSymbol(p.getSymbol());
        r.setExchange(p.getExchange());
        r.setNetQuantity(p.getNetQuantity());
        r.setAvgCostPrice(p.getAvgCostPrice());
        r.setCurrentMarketPrice(p.getCurrentMarketPrice());
        r.setMarketValue(p.getMarketValue());
        r.setCostBasis(p.getCostBasis());
        r.setUnrealizedPnL(p.getUnrealizedPnL());
        r.setUnrealizedPnLPct(p.getUnrealizedPnLPct());
        r.setRealizedPnL(p.getRealizedPnL());
        r.setTotalPnL(p.getTotalPnL());
        if (p.getCostBasis() != null && p.getCostBasis().compareTo(BigDecimal.ZERO) > 0 && p.getTotalPnL() != null) {
            r.setTotalPnLPct(p.getTotalPnL().divide(p.getCostBasis(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
        }
        r.setDayPnL(p.getDayPnL());
        if (p.getDayPnL() != null && p.getMarketValue() != null) {
            BigDecimal prevValue = p.getMarketValue().subtract(p.getDayPnL());
            if (prevValue.compareTo(BigDecimal.ZERO) > 0) {
                r.setDayPnLPct(p.getDayPnL().divide(prevValue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)));
            }
        }
        r.setLastUpdated(p.getLastUpdated());
        return r;
    }
}
