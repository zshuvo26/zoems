package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class BsecReportResponse {
    private String reportType;   // DAILY_TRADE, POSITION, CLIENT_EXPOSURE
    private String reportDate;
    private String exchange;
    private String generatedAt;
    private String generatedBy;

    private int totalRecords;
    private BigDecimal totalTradeValue;
    private BigDecimal totalBrokerage;

    private List<TradeReportLine> trades;

    @Data
    public static class TradeReportLine {
        private String serialNo;
        private String tradeDate;
        private String tradeId;
        private String boAccountNo;
        private String symbol;
        private String isin;
        private String side;
        private BigDecimal quantity;
        private BigDecimal price;
        private BigDecimal grossValue;
        private BigDecimal brokerage;
        private BigDecimal secLevy;
        private BigDecimal ait;
        private BigDecimal dseSmeFee;
        private BigDecimal netValue;
        private String settlementDate;
    }
}
