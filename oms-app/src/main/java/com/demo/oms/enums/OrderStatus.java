package com.demo.oms.enums;

public enum OrderStatus {
    NEW,              // Received by OMS, not yet sent to exchange
    PENDING_NEW,      // Sent to exchange, awaiting acknowledgment
    ACKNOWLEDGED,     // Exchange acknowledged
    PARTIALLY_FILLED, // Some quantity filled, remainder active
    FILLED,           // Fully filled
    PENDING_CANCEL,   // Cancel request sent to exchange
    CANCELLED,        // Fully cancelled by client or exchange
    PENDING_REPLACE,  // Amendment request sent
    REPLACED,         // Amendment accepted; old order superseded
    REJECTED,         // Rejected by risk engine or exchange
    EXPIRED,          // GTD/GTC order expired
    DONE_FOR_DAY,     // Residual cancelled at market close
    SUSPENDED         // Halted due to circuit breaker or regulatory action
}
