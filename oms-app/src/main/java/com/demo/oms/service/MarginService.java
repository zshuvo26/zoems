package com.demo.oms.service;

import com.demo.oms.domain.Account;
import com.demo.oms.domain.RiskLimit;
import com.demo.oms.dto.MarginStatusResponse;
import com.demo.oms.repository.AccountRepository;
import com.demo.oms.repository.RiskLimitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarginService {

    private static final BigDecimal MARGIN_CALL_THRESHOLD = new BigDecimal("75"); // 75%
    private static final BigDecimal LIQUIDATION_THRESHOLD = new BigDecimal("90"); // 90%
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final AccountRepository accountRepository;
    private final RiskLimitRepository riskLimitRepository;
    private final NotificationService notificationService;

    public MarginStatusResponse getMarginStatus(String accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new com.demo.oms.exception.OmsException("NOT_FOUND", "Account not found"));

        RiskLimit limits = riskLimitRepository.findByAccountId(accountId).orElse(defaultLimits(accountId));

        MarginStatusResponse resp = new MarginStatusResponse();
        resp.setAccountId(accountId);
        resp.setCashBalance(account.getCashBalance().setScale(2, RoundingMode.HALF_UP));

        BigDecimal portfolioValue = account.getPortfolioValue() != null ? account.getPortfolioValue() : BigDecimal.ZERO;
        resp.setPortfolioValue(portfolioValue.setScale(2, RoundingMode.HALF_UP));

        BigDecimal totalEquity = account.getTotalEquity() != null
                ? account.getTotalEquity()
                : account.getCashBalance().add(portfolioValue);
        resp.setTotalEquity(totalEquity.setScale(2, RoundingMode.HALF_UP));

        BigDecimal marginLimit = account.getCreditLimit() != null ? account.getCreditLimit() : BigDecimal.ZERO;
        resp.setMarginLimit(marginLimit.setScale(2, RoundingMode.HALF_UP));

        // Used margin: blocked amount (buy orders pending settlement + open positions funded by margin)
        BigDecimal usedMargin = account.getBlockedAmount() != null ? account.getBlockedAmount() : BigDecimal.ZERO;
        resp.setUsedMargin(usedMargin.setScale(2, RoundingMode.HALF_UP));

        BigDecimal availableMargin = marginLimit.subtract(usedMargin);
        resp.setAvailableMargin(availableMargin.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));

        // Utilization %
        BigDecimal utilization = marginLimit.compareTo(BigDecimal.ZERO) > 0
                ? usedMargin.divide(marginLimit, 4, RoundingMode.HALF_UP).multiply(HUNDRED).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        resp.setMarginUtilizationPct(utilization);

        resp.setMarginCallThresholdPct(MARGIN_CALL_THRESHOLD);
        resp.setMarginCallActive(utilization.compareTo(MARGIN_CALL_THRESHOLD) >= 0);
        resp.setLiquidationRisk(utilization.compareTo(LIQUIDATION_THRESHOLD) >= 0);

        // Buying power = totalEquity × marginMultiplier
        BigDecimal multiplier = limits.getMarginMultiplier() != null
                ? limits.getMarginMultiplier()
                : BigDecimal.ONE;
        resp.setMarginMultiplier(multiplier);
        resp.setBuyingPower(totalEquity.multiply(multiplier).setScale(2, RoundingMode.HALF_UP));

        // Trigger margin call notification if threshold breached
        if (resp.isMarginCallActive() && account.isMarginEnabled()) {
            notificationService.notifyMarginCall(accountId, utilization);
        }

        return resp;
    }

    private RiskLimit defaultLimits(String accountId) {
        RiskLimit rl = new RiskLimit();
        rl.setAccountId(accountId);
        return rl;
    }
}
