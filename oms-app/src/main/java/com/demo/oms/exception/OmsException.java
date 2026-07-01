package com.demo.oms.exception;

public class OmsException extends RuntimeException {
    private final String errorCode;

    public OmsException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
