package com.demo.oms.dto;

import com.demo.oms.domain.RiskLimit;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RiskLimitsResponse {

    private String accountId;
    private BigDecimal maxOrderValue;
    private BigDecimal maxOrderQuantity;
    private BigDecimal maxPositionValue;
    private BigDecimal maxExposurePerSymbol;
    private BigDecimal maxExposurePct;
    private BigDecimal maxDailyTurnover;
    private BigDecimal maxLossPerDay;         // mapped from RiskLimit.maxDailyLoss
    private int maxOrdersPerDay;
    private BigDecimal marginMultiplier;
    private boolean enableShortSelling;
    private boolean enableMargin;

    public static RiskLimitsResponse from(String accountId, RiskLimit rl) {
        RiskLimitsResponse r = new RiskLimitsResponse();
        r.setAccountId(accountId);
        r.setMaxOrderValue(rl.getMaxOrderValue());
        r.setMaxOrderQuantity(rl.getMaxOrderQuantity());
        r.setMaxPositionValue(rl.getMaxPositionValue());
        r.setMaxExposurePerSymbol(rl.getMaxExposurePerSymbol());
        r.setMaxExposurePct(rl.getMaxExposurePct());
        r.setMaxDailyTurnover(rl.getMaxDailyTurnover());
        r.setMaxLossPerDay(rl.getMaxDailyLoss());
        r.setMaxOrdersPerDay(rl.getMaxOrdersPerDay());
        r.setMarginMultiplier(rl.getMarginMultiplier());
        r.setEnableShortSelling(rl.isEnableShortSelling());
        r.setEnableMargin(rl.isEnableMargin());
        return r;
    }
}
