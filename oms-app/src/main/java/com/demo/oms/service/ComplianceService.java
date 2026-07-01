package com.demo.oms.service;

import com.demo.oms.domain.ComplianceRule;
import com.demo.oms.domain.Order;
import com.demo.oms.enums.ComplianceRuleType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderStatus;
import com.demo.oms.exception.OmsException;
import com.demo.oms.repository.ComplianceRuleRepository;
import com.demo.oms.repository.OrderRepository;
import com.demo.oms.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceService {

    private final ComplianceRuleRepository ruleRepository;
    private final OrderRepository orderRepository;
    private final PositionRepository positionRepository;

    /**
     * Pre-trade compliance check. Throws OmsException("COMPLIANCE_VIOLATION", ...) on breach.
     */
    public void checkPreTrade(String accountId, String symbol, OrderSide side,
                               BigDecimal quantity, BigDecimal price, com.demo.oms.enums.OrderType orderType) {
        List<ComplianceRule> rules = ruleRepository.findActiveRules(LocalDate.now());

        for (ComplianceRule rule : rules) {
            switch (rule.getRuleType()) {
                case RESTRICTED_SECURITY -> checkRestrictedSecurity(rule, symbol);
                case BLACKLISTED_ACCOUNT  -> checkBlacklistedAccount(rule, accountId);
                case WASH_TRADE_WINDOW    -> checkWashTrade(rule, accountId, symbol, side);
                case DUPLICATE_ORDER_WINDOW -> checkDuplicateOrder(rule, accountId, symbol, side, quantity, price);
                case MAX_POSITION_LIMIT   -> checkMaxPosition(rule, accountId, symbol, side, quantity);
                case INSIDER_RESTRICTION  -> checkInsiderRestriction(rule, accountId, symbol);
                default -> {} // other rules evaluated post-trade or asynchronously
            }
        }
    }

    private void checkRestrictedSecurity(ComplianceRule rule, String symbol) {
        String scope = rule.getScope();
        if (("SYMBOL:" + symbol).equals(scope) || "GLOBAL".equals(scope)) {
            throw new OmsException("COMPLIANCE_VIOLATION",
                    "Trading in " + symbol + " is restricted: " + rule.getDescription());
        }
    }

    private void checkBlacklistedAccount(ComplianceRule rule, String accountId) {
        if (("ACCOUNT:" + accountId).equals(rule.getScope())) {
            throw new OmsException("COMPLIANCE_VIOLATION",
                    "Account " + accountId + " is blocked from trading: " + rule.getDescription());
        }
    }

    private void checkWashTrade(ComplianceRule rule, String accountId, String symbol, OrderSide side) {
        int windowMinutes = parseInt(rule.getRuleValue(), 30);
        LocalDateTime since = LocalDateTime.now().minusMinutes(windowMinutes);
        OrderSide oppositeSide = (side == OrderSide.BUY) ? OrderSide.SELL : OrderSide.BUY;

        // Check if there's a recent completed/pending order on the opposite side
        boolean washTradeRisk = orderRepository.findByAccountIdOrderByCreatedAtDesc(accountId)
                .stream()
                .filter(o -> o.getSymbol().equals(symbol))
                .filter(o -> o.getSide() == oppositeSide)
                .filter(o -> o.getCreatedAt().isAfter(since))
                .filter(o -> o.getStatus() != OrderStatus.REJECTED && o.getStatus() != OrderStatus.CANCELLED)
                .findFirst()
                .isPresent();

        if (washTradeRisk) {
            throw new OmsException("COMPLIANCE_VIOLATION",
                    String.format("Potential wash trade: %s on opposite side within %d minutes for %s",
                            oppositeSide, windowMinutes, symbol));
        }
    }

    private void checkDuplicateOrder(ComplianceRule rule, String accountId, String symbol,
                                      OrderSide side, BigDecimal quantity, BigDecimal price) {
        int windowSeconds = parseInt(rule.getRuleValue(), 30);
        LocalDateTime since = LocalDateTime.now().minusSeconds(windowSeconds);

        boolean duplicate = orderRepository.findByAccountIdOrderByCreatedAtDesc(accountId)
                .stream()
                .filter(o -> o.getSymbol().equals(symbol))
                .filter(o -> o.getSide() == side)
                .filter(o -> o.getCreatedAt().isAfter(since))
                .filter(o -> o.getStatus() != OrderStatus.REJECTED && o.getStatus() != OrderStatus.CANCELLED)
                .filter(o -> o.getQuantity() != null && o.getQuantity().compareTo(quantity) == 0)
                .filter(o -> price == null || (o.getPrice() != null && o.getPrice().compareTo(price) == 0))
                .findFirst()
                .isPresent();

        if (duplicate) {
            throw new OmsException("COMPLIANCE_VIOLATION",
                    String.format("Duplicate order detected: identical %s %s order within %d seconds",
                            side, symbol, windowSeconds));
        }
    }

    private void checkMaxPosition(ComplianceRule rule, String accountId, String symbol,
                                   OrderSide side, BigDecimal quantity) {
        if (side != OrderSide.BUY) return;
        String scope = rule.getScope();
        if (!("SYMBOL:" + symbol).equals(scope) && !"GLOBAL".equals(scope)) return;

        BigDecimal maxShares = new BigDecimal(rule.getRuleValue() != null ? rule.getRuleValue() : "1000000");
        positionRepository.findByAccountIdAndSymbolAndExchange(accountId, symbol, "DSE").ifPresent(pos -> {
            if (pos.getNetQuantity().add(quantity).compareTo(maxShares) > 0) {
                throw new OmsException("COMPLIANCE_VIOLATION",
                        String.format("Position in %s would exceed limit of %.0f shares", symbol, maxShares));
            }
        });
    }

    private void checkInsiderRestriction(ComplianceRule rule, String accountId, String symbol) {
        String scope = rule.getScope();
        boolean accountMatch = ("ACCOUNT:" + accountId).equals(scope);
        boolean symbolMatch  = ("SYMBOL:" + symbol).equals(scope);
        if (accountMatch || symbolMatch) {
            throw new OmsException("COMPLIANCE_VIOLATION",
                    "Trading restricted during blackout period: " + rule.getDescription());
        }
    }

    public List<ComplianceRule> getAllRules() {
        return ruleRepository.findAll();
    }

    public ComplianceRule addRule(ComplianceRule rule) {
        return ruleRepository.save(rule);
    }

    public void deactivateRule(java.util.UUID ruleId) {
        ruleRepository.findById(ruleId).ifPresent(r -> {
            r.setActive(false);
            ruleRepository.save(r);
        });
    }

    private int parseInt(String value, int defaultValue) {
        try { return Integer.parseInt(value); } catch (Exception e) { return defaultValue; }
    }
}
