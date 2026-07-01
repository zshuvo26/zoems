package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class MarketBreadthResponse {
    private String exchange;
    private String asOf;

    // Advance/Decline
    private int totalInstruments;
    private int advancers;       // instruments with lastPrice > prevClose
    private int decliners;       // instruments with lastPrice < prevClose
    private int unchanged;

    private BigDecimal advanceDeclineRatio;

    private BigDecimal totalVolume;
    private BigDecimal totalTradedValue;  // BDT

    // DSEX index proxy (weighted avg of top stocks)
    private BigDecimal indexLevel;
    private BigDecimal indexChange;
    private BigDecimal indexChangePct;

    private List<MoverEntry> topGainers;
    private List<MoverEntry> topLosers;
    private List<MoverEntry> mostActive;   // by volume

    @Data
    public static class MoverEntry {
        private String symbol;
        private String name;
        private BigDecimal lastPrice;
        private BigDecimal change;
        private BigDecimal changePct;
        private BigDecimal volume;
        private BigDecimal tradedValue;
        private String board;
    }
}
