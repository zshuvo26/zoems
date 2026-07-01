package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class OrderBookResponse {
    private String symbol;
    private String exchange;
    private String timestamp;

    private BigDecimal lastPrice;
    private BigDecimal prevClose;
    private BigDecimal change;
    private BigDecimal changePct;

    // Level 2 order book — top 5 levels
    private List<BookLevel> bids;   // buy side — descending price
    private List<BookLevel> asks;   // sell side — ascending price

    private BigDecimal totalBidQty;
    private BigDecimal totalAskQty;
    private BigDecimal bidAskSpread;
    private BigDecimal bidAskSpreadPct;

    @Data
    public static class BookLevel {
        private int level;
        private BigDecimal price;
        private BigDecimal quantity;
        private int orderCount;
    }
}
