package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MarketDataResponse {
    private String symbol;
    private String exchange;
    private String name;
    private BigDecimal lastPrice;
    private BigDecimal openPrice;
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private BigDecimal previousClose;
    private BigDecimal change;
    private BigDecimal changePct;
    private BigDecimal bidPrice;
    private BigDecimal askPrice;
    private BigDecimal volume;
    private BigDecimal tradedValue;
    private BigDecimal upperCircuitLimit;
    private BigDecimal lowerCircuitLimit;
    private boolean halted;
    private boolean underCircuitBreaker;
    private LocalDateTime lastUpdated;
}
