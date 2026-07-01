package com.demo.oms.service;

import com.demo.oms.domain.Trade;
import com.demo.oms.dto.SettlementSummaryResponse;
import com.demo.oms.repository.AccountRepository;
import com.demo.oms.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final TradeRepository tradeRepository;
    private final AccountRepository accountRepository;

    /**
     * Mark all trades whose settlementDate <= today as settled.
     * Called by MarketScheduler at market open.
     */
    @Transactional
    public int processMaturedSettlements() {
        List<Trade> due = tradeRepository.findBySettledFalse();
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        int count = 0;
        for (Trade t : due) {
            if (t.getSettlementDate() != null && t.getSettlementDate().compareTo(today) <= 0) {
                t.setSettled(true);
                tradeRepository.save(t);
                count++;
                log.debug("Settled trade {} for {} {}", t.getTradeId(), t.getAccountId(), t.getSymbol());
            }
        }
        if (count > 0) log.info("Settlement: {} trade(s) settled on {}", count, today);
        return count;
    }

    public SettlementSummaryResponse getSummary(String accountId) {
        return getSummaryForDate(accountId, null);
    }

    public SettlementSummaryResponse getSummaryForDate(String accountId, String settlementDate) {
        List<Trade> trades = tradeRepository.findByAccountIdOrderByTradeTimeDesc(accountId);
        if (settlementDate != null) {
            trades = trades.stream()
                    .filter(t -> settlementDate.equals(t.getSettlementDate()))
                    .collect(Collectors.toList());
        }

        SettlementSummaryResponse resp = new SettlementSummaryResponse();
        resp.setAccountId(accountId);
        resp.setSettlementDate(settlementDate != null ? settlementDate : "ALL");

        long settled = trades.stream().filter(Trade::isSettled).count();
        long pending = trades.stream().filter(t -> !t.isSettled()).count();

        resp.setTotalTrades(trades.size());
        resp.setSettled((int) settled);
        resp.setPending((int) pending);
        resp.setFailed(0);

        // Net payable = sum of buy netValues (money going out)
        // Net receivable = sum of sell netValues (money coming in)
        BigDecimal payable = trades.stream()
                .filter(t -> "BUY".equals(t.getSide()) && !t.isSettled())
                .map(t -> t.getNetValue() != null ? t.getNetValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal receivable = trades.stream()
                .filter(t -> "SELL".equals(t.getSide()) && !t.isSettled())
                .map(t -> t.getNetValue() != null ? t.getNetValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        resp.setTotalNetPayable(payable.setScale(2, RoundingMode.HALF_UP));
        resp.setTotalNetReceivable(receivable.setScale(2, RoundingMode.HALF_UP));
        resp.setNetSettlementAmount(receivable.subtract(payable).setScale(2, RoundingMode.HALF_UP));

        resp.setItems(trades.stream().map(t -> {
            SettlementSummaryResponse.SettlementItem item = new SettlementSummaryResponse.SettlementItem();
            item.setTradeId(t.getTradeId());
            item.setSymbol(t.getSymbol());
            item.setSide(t.getSide());
            item.setQuantity(t.getQuantity());
            item.setPrice(t.getPrice());
            item.setNetValue(t.getNetValue());
            item.setSettlementDate(t.getSettlementDate());
            item.setStatus(t.isSettled() ? "SETTLED" : "PENDING");
            return item;
        }).collect(Collectors.toList()));

        return resp;
    }

    /** Get all pending settlements across all accounts (for ops/broker view) */
    public List<Trade> getPendingSettlements() {
        return tradeRepository.findBySettledFalse();
    }
}
