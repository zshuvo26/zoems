package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SettlementSummaryResponse {
    private String accountId;
    private String settlementDate;

    private int totalTrades;
    private int settled;
    private int pending;
    private int failed;

    private BigDecimal totalNetPayable;    // BDT owed to broker (buys)
    private BigDecimal totalNetReceivable; // BDT due from broker (sells)
    private BigDecimal netSettlementAmount;

    private List<SettlementItem> items;

    @Data
    public static class SettlementItem {
        private String tradeId;
        private String symbol;
        private String side;
        private BigDecimal quantity;
        private BigDecimal price;
        private BigDecimal netValue;
        private String settlementDate;
        private String status; // PENDING / SETTLED / FAILED
    }
}
