package com.demo.oms.enums;

public enum SettlementType {
    T0,   // Same-day settlement
    T1,   // Next-day settlement
    T2,   // Standard BD settlement (T+2 business days)
    T3,   // Three-day settlement
    DVP,  // Delivery Versus Payment (institutional)
    FOP   // Free Of Payment (transfer without cash settlement)
}
