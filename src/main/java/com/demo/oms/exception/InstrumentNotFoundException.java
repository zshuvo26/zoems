package com.demo.oms.exception;

public class InstrumentNotFoundException extends OmsException {
    public InstrumentNotFoundException(String symbol) {
        super("INSTRUMENT_NOT_FOUND", "Instrument not found or not tradeable: " + symbol);
    }
}
