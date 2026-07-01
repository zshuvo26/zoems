package com.demo.oms.service;

import com.demo.oms.domain.Order;
import com.demo.oms.domain.Trade;
import com.demo.oms.dto.TcaResponse;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.OrderRepository;
import com.demo.oms.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TcaService {

    private static final BigDecimal BPS = new BigDecimal("10000");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal AVG_DAILY_VOLUME = new BigDecimal("500000"); // placeholder ADV

    private final OrderRepository orderRepository;
    private final TradeRepository tradeRepository;
    private final InstrumentRepository instrumentRepository;

    public TcaResponse analyzeOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new com.demo.oms.exception.OrderNotFoundException(orderId.toString()));

        List<Trade> fills = tradeRepository.findByOrderId(orderId);

        TcaResponse resp = new TcaResponse();
        resp.setOrderId(orderId);
        resp.setSymbol(order.getSymbol());
        resp.setSide(order.getSide() != null ? order.getSide().name() : null);
        resp.setTotalQuantity(order.getQuantity());
        resp.setExecutedQuantity(order.getFilledQuantity());

        // Arrival price = order submission price (limit price, or last price at submit time)
        BigDecimal arrival = order.getPrice();
        if (arrival == null) {
            arrival = instrumentRepository.findById(order.getSymbol())
                    .map(i -> i.getLastPrice()).orElse(BigDecimal.ZERO);
        }
        resp.setArrivalPrice(arrival);

        if (fills.isEmpty()) {
            resp.setSlippageBdt(BigDecimal.ZERO);
            resp.setSlippageBps(BigDecimal.ZERO);
            resp.setTotalCostBdt(BigDecimal.ZERO);
            resp.setTotalCostBps(BigDecimal.ZERO);
            resp.setFills(List.of());
            return resp;
        }

        // VWAP of fills
        BigDecimal totalGross = fills.stream()
                .map(t -> t.getPrice().multiply(t.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalQty = fills.stream()
                .map(Trade::getQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal vwap = totalQty.compareTo(BigDecimal.ZERO) > 0
                ? totalGross.divide(totalQty, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        resp.setVwapFill(vwap);

        // Slippage: buy = avgFill - arrival; sell = arrival - avgFill (positive = bad)
        int sign = order.getSide() == OrderSide.SELL ? -1 : 1;
        BigDecimal slippagePerShare = vwap.subtract(arrival).multiply(BigDecimal.valueOf(sign));
        BigDecimal slippageBdt = slippagePerShare.multiply(totalQty).setScale(2, RoundingMode.HALF_UP);
        resp.setSlippageBdt(slippageBdt);

        // Slippage in bps: (slippage / arrival) × 10000
        BigDecimal slippageBps = arrival.compareTo(BigDecimal.ZERO) > 0
                ? slippageBdt.divide(arrival.multiply(totalQty), 4, RoundingMode.HALF_UP).multiply(BPS).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        resp.setSlippageBps(slippageBps);

        // Implementation shortfall = (vwap - arrival) / arrival × sign × 10000 bps
        BigDecimal isBps = arrival.compareTo(BigDecimal.ZERO) > 0
                ? vwap.subtract(arrival)
                      .divide(arrival, 8, RoundingMode.HALF_UP)
                      .multiply(BigDecimal.valueOf(sign))
                      .multiply(BPS)
                      .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        resp.setImplementationShortfallBps(isBps);

        // Market impact: qty executed as % of estimated ADV
        BigDecimal marketImpact = totalQty.divide(AVG_DAILY_VOLUME, 4, RoundingMode.HALF_UP)
                .multiply(HUNDRED).setScale(2, RoundingMode.HALF_UP);
        resp.setMarketImpactPct(marketImpact);

        // Total transaction costs (commission + fees)
        BigDecimal totalCost = fills.stream()
                .map(t -> t.getCommission().add(t.getSecFee()).add(t.getAit()).add(t.getDseSmeFee()))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        resp.setTotalCostBdt(totalCost);

        BigDecimal costBps = totalGross.compareTo(BigDecimal.ZERO) > 0
                ? totalCost.divide(totalGross, 8, RoundingMode.HALF_UP).multiply(BPS).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        resp.setTotalCostBps(costBps);

        // TWAP benchmark (simple: arrival price as benchmark for now)
        resp.setTwapBenchmark(arrival);

        // Fill breakdown
        final BigDecimal arrivalPrice = arrival;
        resp.setFills(fills.stream().map(t -> {
            TcaResponse.FillBreakdown fb = new TcaResponse.FillBreakdown();
            fb.setTradeId(t.getTradeId());
            fb.setQuantity(t.getQuantity());
            fb.setFillPrice(t.getPrice());
            BigDecimal slip = t.getPrice().subtract(arrivalPrice).multiply(BigDecimal.valueOf(sign));
            fb.setSlippageVsArrival(slip.setScale(4, RoundingMode.HALF_UP));
            fb.setTradeTime(t.getTradeTime().toString());
            return fb;
        }).collect(Collectors.toList()));

        return resp;
    }

    public List<TcaResponse> analyzeAccount(String accountId) {
        return orderRepository.findByAccountIdOrderByCreatedAtDesc(accountId)
                .stream()
                .filter(o -> o.getFilledQuantity() != null && o.getFilledQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(o -> analyzeOrder(o.getId()))
                .collect(Collectors.toList());
    }
}
