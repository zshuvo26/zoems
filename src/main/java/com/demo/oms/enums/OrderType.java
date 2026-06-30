package com.demo.oms.enums;

public enum OrderType {
    MARKET,          // Execute at best available price
    LIMIT,           // Execute at specified price or better
    STOP,            // Trigger market order when stop price is hit
    STOP_LIMIT,      // Trigger limit order when stop price is hit
    MARKET_ON_CLOSE, // Execute at closing price
    LIMIT_ON_CLOSE   // Execute at close only if at limit or better
}
