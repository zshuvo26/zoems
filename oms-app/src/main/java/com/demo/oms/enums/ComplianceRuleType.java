package com.demo.oms.enums;

public enum ComplianceRuleType {
    RESTRICTED_SECURITY,     // Symbol is on restricted list — block all orders
    BLACKLISTED_ACCOUNT,     // Account is blocked from trading
    MAX_POSITION_LIMIT,      // Maximum shares allowed in a symbol
    MIN_HOLDING_PERIOD,      // Must hold for N days before selling
    SECTOR_CONCENTRATION,    // Max % of portfolio in one sector
    WASH_TRADE_WINDOW,       // Block buy+sell of same symbol within N minutes
    DUPLICATE_ORDER_WINDOW,  // Block identical orders within N seconds
    INSIDER_RESTRICTION,     // Blocked during quiet/blackout periods
    MAX_DAILY_ORDER_VALUE    // Per-symbol daily order value cap
}
