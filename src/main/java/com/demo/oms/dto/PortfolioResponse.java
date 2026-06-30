package com.demo.oms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PortfolioResponse {
    private String accountId;
    private BigDecimal cashBalance;
    private BigDecimal portfolioValue;
    private BigDecimal totalEquity;
    private BigDecimal totalUnrealizedPnL;
    private BigDecimal totalRealizedPnL;

    @JsonProperty("totalPnl")
    private BigDecimal totalPnL;

    @JsonProperty("dayPnl")
    private BigDecimal dayPnL;

    private BigDecimal totalPnlPct;
    private BigDecimal dayPnlPct;

    private List<PositionResponse> positions;
    private LocalDateTime asOf;
}
