package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PerformanceResponse {
    private String accountId;
    private String period;          // "1D", "1W", "1M", "3M", "YTD", "1Y"
    private String asOf;

    // Absolute P&L
    private BigDecimal realizedPnL;
    private BigDecimal unrealizedPnL;
    private BigDecimal totalPnL;

    // Returns
    private BigDecimal portfolioReturnPct;
    private BigDecimal benchmarkReturnPct;  // DSEX proxy
    private BigDecimal alphaPct;            // portfolio - benchmark

    // Risk metrics
    private BigDecimal portfolioValue;
    private BigDecimal cashBalance;
    private BigDecimal totalEquity;

    // Sector allocation
    private List<SectorAllocation> sectorBreakdown;

    // Top performers / laggards
    private List<PositionPerformance> topContributors;
    private List<PositionPerformance> bottomContributors;

    @Data
    public static class SectorAllocation {
        private String sector;
        private BigDecimal marketValue;
        private BigDecimal weightPct;
        private BigDecimal sectorPnL;
        private BigDecimal sectorReturnPct;
    }

    @Data
    public static class PositionPerformance {
        private String symbol;
        private BigDecimal quantity;
        private BigDecimal avgCost;
        private BigDecimal currentPrice;
        private BigDecimal unrealizedPnL;
        private BigDecimal returnPct;
        private BigDecimal portfolioWeightPct;
    }
}
