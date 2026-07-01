package com.demo.oms.enums;

public enum AlgoStatus {
    PENDING,    // Created, not yet started
    RUNNING,    // Actively submitting child slices
    PAUSED,     // Temporarily suspended by dealer
    COMPLETED,  // All quantity executed
    CANCELLED   // Cancelled before full execution
}
