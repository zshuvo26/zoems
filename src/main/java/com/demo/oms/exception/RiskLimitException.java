package com.demo.oms.exception;

public class RiskLimitException extends OmsException {
    public RiskLimitException(String message) {
        super("RISK_LIMIT_BREACH", message);
    }
}
