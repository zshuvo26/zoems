package com.demo.oms.exception;

public class OrderNotFoundException extends OmsException {
    public OrderNotFoundException(String orderId) {
        super("ORDER_NOT_FOUND", "Order not found: " + orderId);
    }
}
