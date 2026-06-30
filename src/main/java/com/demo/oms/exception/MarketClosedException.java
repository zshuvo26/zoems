package com.demo.oms.exception;

public class MarketClosedException extends OmsException {
    public MarketClosedException(String message) {
        super("MARKET_CLOSED", message);
    }
}
