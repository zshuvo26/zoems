package com.demo.oms.service;

import com.demo.oms.dto.SmartRouterResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.OrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Smart Order Router — selects the optimal execution venue (DSE/CSE/OTC/DARK_POOL)
 * based on real-time liquidity, fee structure, and latency profiles.
 */
@Slf4j
@Service
public class SmartOrderRouterService {

    // Bangladesh brokerage fee per exchange (bps of trade value)
    private static final double DSE_FEE_BPS   = 50.0;  // 0.50%
    private static final double CSE_FEE_BPS   = 52.0;  // 0.52% (slightly higher)
    private static final double OTC_FEE_BPS   = 30.0;  // 0.30% (negotiated)
    private static final double DARK_FEE_BPS  = 20.0;  // 0.20% (dark pool discount)

    // Simulated average round-trip latency in ms
    private static final double DSE_LATENCY_MS  = 45.0;
    private static final double CSE_LATENCY_MS  = 65.0;
    private static final double OTC_LATENCY_MS  = 200.0;
    private static final double DARK_LATENCY_MS = 120.0;

    @Autowired private InstrumentRepository instrumentRepo;
    @Autowired private OrderRepository orderRepository;

    public SmartRouterResponse selectVenue(String symbol, OrderSide side, BigDecimal quantity, BigDecimal priceLimit) {
        List<SmartRouterResponse.VenueScore> scores = new ArrayList<>();

        // DSE
        double dseLiquidity = getDseLiquidity(symbol);
        scores.add(scoreVenue("DSE", dseLiquidity, DSE_FEE_BPS, DSE_LATENCY_MS));

        // CSE — typically lower liquidity than DSE for most BD stocks
        double cseLiquidity = dseLiquidity * 0.35; // CSE is ~35% of DSE volume on average
        scores.add(scoreVenue("CSE", cseLiquidity, CSE_FEE_BPS, CSE_LATENCY_MS));

        // OTC — for block trades; preferred for large quantity
        double orderValue = quantity != null && priceLimit != null
            ? quantity.multiply(priceLimit).doubleValue() : 0.0;
        double otcLiquidity = orderValue > 5_000_000 ? 85.0 : 20.0; // OTC good for large blocks
        scores.add(scoreVenue("OTC", otcLiquidity, OTC_FEE_BPS, OTC_LATENCY_MS));

        // DARK_POOL — good for large orders with minimal market impact
        double darkLiquidity = orderValue > 10_000_000 ? 75.0 : 15.0;
        scores.add(scoreVenue("DARK_POOL", darkLiquidity, DARK_FEE_BPS, DARK_LATENCY_MS));

        scores.sort(Comparator.comparingDouble(SmartRouterResponse.VenueScore::getScore).reversed());

        SmartRouterResponse.VenueScore best = scores.get(0);
        String reason = buildReason(best, quantity, priceLimit);

        SmartRouterResponse resp = new SmartRouterResponse();
        resp.setSelectedVenue(best.getVenue());
        resp.setSelectedScore(best.getScore());
        resp.setPrimaryReason(reason);
        resp.setAllVenueScores(scores);
        resp.setSymbol(symbol);
        resp.setSide(side != null ? side.name() : null);
        resp.setQuantity(quantity != null ? quantity.doubleValue() : 0);
        return resp;
    }

    private SmartRouterResponse.VenueScore scoreVenue(String venue, double liquidity, double feeBps, double latencyMs) {
        // Normalise: liquidity 0-100, fees lower=better (max 100bps), latency lower=better (max 300ms)
        double liquidityScore = Math.min(liquidity, 100.0);
        double feeScore       = Math.max(0, 100.0 - feeBps);
        double latencyScore   = Math.max(0, 100.0 - (latencyMs / 3.0));

        // Weighted composite: liquidity 50%, fee 30%, latency 20%
        double composite = (liquidityScore * 0.50) + (feeScore * 0.30) + (latencyScore * 0.20);

        SmartRouterResponse.VenueScore vs = new SmartRouterResponse.VenueScore();
        vs.setVenue(venue);
        vs.setScore(Math.round(composite * 10.0) / 10.0);
        vs.setLiquidityScore(liquidityScore);
        vs.setFeeScore(feeScore);
        vs.setLatencyScore(latencyScore);
        vs.setRationale(String.format("Liq=%.0f Fee=%.1fbps Lat=%.0fms", liquidity, feeBps, latencyMs));
        return vs;
    }

    private double getDseLiquidity(String symbol) {
        return instrumentRepo.findById(symbol).map(inst -> {
            if (inst.getVolume() == null) return 50.0;
            // Score 0-100 based on traded value tier
            double tv = inst.getTradedValue() != null ? inst.getTradedValue().doubleValue() : 0.0;
            if (tv > 100_000_000) return 95.0;
            if (tv > 50_000_000)  return 80.0;
            if (tv > 10_000_000)  return 65.0;
            if (tv > 1_000_000)   return 45.0;
            return 25.0;
        }).orElse(50.0);
    }

    private String buildReason(SmartRouterResponse.VenueScore best, BigDecimal qty, BigDecimal price) {
        return switch (best.getVenue()) {
            case "DSE"       -> "Highest liquidity and tightest spreads on DSE";
            case "CSE"       -> "Better liquidity on CSE for this instrument";
            case "OTC"       -> "Large block size favours OTC negotiated trade (lower market impact)";
            case "DARK_POOL" -> "Dark pool minimises market impact for institutional size order";
            default          -> "Optimal composite score";
        };
    }
}
