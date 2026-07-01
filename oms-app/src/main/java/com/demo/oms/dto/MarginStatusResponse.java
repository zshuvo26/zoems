package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MarginStatusResponse {
    private String accountId;

    private BigDecimal cashBalance;
    private BigDecimal portfolioValue;
    private BigDecimal totalEquity;

    private BigDecimal marginLimit;        // creditLimit from account
    private BigDecimal usedMargin;         // value of open leveraged positions
    private BigDecimal availableMargin;    // marginLimit - usedMargin

    private BigDecimal marginUtilizationPct;
    private BigDecimal marginCallThresholdPct = new BigDecimal("75"); // call at 75% utilization
    private boolean marginCallActive;

    private BigDecimal maintenanceMarginPct = new BigDecimal("50"); // liquidation at 50%
    private boolean liquidationRisk;

    private BigDecimal buyingPower;        // totalEquity × marginMultiplier
    private BigDecimal marginMultiplier;   // from RiskLimit
}
