package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PositionResponse {
    private UUID id;
    private String accountId;
    private String symbol;
    private String exchange;
    private BigDecimal netQuantity;
    private BigDecimal avgCostPrice;
    private BigDecimal currentMarketPrice;
    private BigDecimal marketValue;
    private BigDecimal costBasis;
    private BigDecimal unrealizedPnL;
    private BigDecimal unrealizedPnLPct;
    private BigDecimal realizedPnL;
    private BigDecimal totalPnL;
    private BigDecimal totalPnLPct;
    private BigDecimal dayPnL;
    private BigDecimal dayPnLPct;
    private LocalDateTime lastUpdated;
}
