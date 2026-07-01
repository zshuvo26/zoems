package com.demo.oms.enums;

public enum AlgoType {
    TWAP,             // Time-Weighted Average Price — equal slices over a time window
    VWAP,             // Volume-Weighted Average Price — slices proportional to volume
    POV,              // Percentage of Volume — participates at a % of market volume
    IS,               // Implementation Shortfall — minimise slippage vs arrival price
    ICEBERG,          // Hidden large order — show only displayQuantity at a time
    ARRIVAL_PRICE,    // Target arrival price; minimise market impact from decision to completion
    LIQUIDITY_SEEKING,// Opportunistically seek liquidity — hit dark pools and lit venues
    SNIPER,           // Aggressive immediate execution — take all available liquidity at once
    STEALTH           // Minimal market impact — small random slices to avoid detection
}
