package com.demo.oms.service;

import com.demo.oms.domain.Order;
import com.demo.oms.domain.Trade;
import com.demo.oms.dto.TradeResponse;
import com.demo.oms.repository.TradeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TradeService {

    // Bangladesh regulatory fee rates (approximate)
    private static final BigDecimal BROKERAGE_RATE   = new BigDecimal("0.005");  // 0.5%
    private static final BigDecimal SEC_LEVY_RATE     = new BigDecimal("0.0005"); // 0.05%
    private static final BigDecimal AIT_RATE_SELL     = new BigDecimal("0.001");  // 0.10% AIT on sell proceeds
    private static final BigDecimal DSE_FEE_RATE      = new BigDecimal("0.0003"); // 0.03% exchange fee

    @Autowired private TradeRepository tradeRepository;
    @Autowired private MarketHoursService marketHoursService;
    @Autowired private PositionService positionService;

    @Transactional
    public Trade recordTrade(Order order, BigDecimal fillQty, BigDecimal fillPrice, String exchangeTradeId) {
        Trade trade = new Trade();
        trade.setTradeId(exchangeTradeId != null ? exchangeTradeId : "TRD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        trade.setOrderId(order.getId());
        trade.setClientOrderId(order.getClientOrderId());
        trade.setAccountId(order.getAccountId());
        trade.setTraderId(order.getTraderId());
        trade.setBrokerId(order.getBrokerId());
        trade.setSymbol(order.getSymbol());
        trade.setExchange(order.getExchange() != null ? order.getExchange().name() : null);
        trade.setSide(order.getSide() != null ? order.getSide().name() : null);
        trade.setQuantity(fillQty);
        trade.setPrice(fillPrice);

        BigDecimal gross = fillQty.multiply(fillPrice);
        trade.setGrossValue(gross);

        BigDecimal commission = gross.multiply(BROKERAGE_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal secFee     = gross.multiply(SEC_LEVY_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal dseSmeFee  = gross.multiply(DSE_FEE_RATE).setScale(2, RoundingMode.HALF_UP);

        // AIT only on sell side
        BigDecimal ait = BigDecimal.ZERO;
        if ("SELL".equals(trade.getSide())) {
            ait = gross.multiply(AIT_RATE_SELL).setScale(2, RoundingMode.HALF_UP);
        }

        trade.setCommission(commission);
        trade.setSecFee(secFee);
        trade.setAit(ait);
        trade.setDseSmeFee(dseSmeFee);
        trade.setNetValue(gross.subtract(commission).subtract(secFee).subtract(ait).subtract(dseSmeFee));
        trade.setTradeTime(LocalDateTime.now());
        trade.setSettlementDate(marketHoursService.getSettlementDate(LocalDate.now()).toString());

        Trade saved = tradeRepository.save(trade);

        // update position
        positionService.applyTrade(saved);

        return saved;
    }

    public List<Trade> getTradesByAccount(String accountId) {
        return tradeRepository.findByAccountIdOrderByTradeTimeDesc(accountId);
    }

    public List<Trade> getTradesByOrder(UUID orderId) {
        return tradeRepository.findByOrderId(orderId);
    }

    public List<TradeResponse> toResponses(List<Trade> trades) {
        return trades.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TradeResponse toResponse(Trade t) {
        TradeResponse r = new TradeResponse();
        r.setId(t.getId());
        r.setTradeId(t.getTradeId());
        r.setOrderId(t.getOrderId());
        r.setClientOrderId(t.getClientOrderId());
        r.setAccountId(t.getAccountId());
        r.setSymbol(t.getSymbol());
        r.setExchange(t.getExchange());
        r.setSide(t.getSide());
        r.setQuantity(t.getQuantity());
        r.setPrice(t.getPrice());
        r.setGrossValue(t.getGrossValue());
        r.setCommission(t.getCommission());
        r.setSecFee(t.getSecFee());
        r.setAit(t.getAit());
        r.setNetValue(t.getNetValue());
        r.setCurrency("BDT");
        r.setTradeTime(t.getTradeTime());
        r.setSettlementDate(t.getSettlementDate());
        r.setSettled(t.isSettled());
        return r;
    }
}
