package com.demo.oms.enums;

public enum AlgoType {
    TWAP,   // Time-Weighted Average Price — equal slices over a time window
    VWAP,   // Volume-Weighted Average Price — slices proportional to volume
    POV,    // Percentage of Volume — participates at a % of market volume
    IS,     // Implementation Shortfall — minimise slippage vs arrival price
    ICEBERG // Hidden large order — show only displayQuantity at a time
}
