package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class TcaResponse {
    private UUID orderId;
    private String symbol;
    private String side;
    private BigDecimal totalQuantity;
    private BigDecimal executedQuantity;

    // Arrival price (price at time of order submission)
    private BigDecimal arrivalPrice;

    // Volume-Weighted Average Price of all fills
    private BigDecimal vwapFill;

    // Theoretical mid price benchmark (estimated)
    private BigDecimal twapBenchmark;

    // Slippage = (avgFillPrice - arrivalPrice) × quantity × sideSign
    // Positive = adverse slippage (paid more for buy / received less for sell)
    private BigDecimal slippageBdt;
    private BigDecimal slippageBps;     // basis points

    // Implementation shortfall = (avgFill - arrival) / arrival × 10000 bps
    private BigDecimal implementationShortfallBps;

    // Market impact estimate (% of ADV executed)
    private BigDecimal marketImpactPct;

    // Total transaction costs
    private BigDecimal totalCostBdt;    // commission + fees
    private BigDecimal totalCostBps;

    private List<FillBreakdown> fills;

    @Data
    public static class FillBreakdown {
        private String tradeId;
        private BigDecimal quantity;
        private BigDecimal fillPrice;
        private BigDecimal slippageVsArrival;
        private String tradeTime;
    }
}
