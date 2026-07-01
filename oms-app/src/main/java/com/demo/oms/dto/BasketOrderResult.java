package com.demo.oms.dto;

import lombok.Data;

import java.util.List;

@Data
public class BasketOrderResult {
    private String basketName;
    private int totalOrders;
    private int accepted;
    private int rejected;
    private List<OrderResult> results;

    @Data
    public static class OrderResult {
        private int index;
        private String symbol;
        private boolean success;
        private OrderResponse order;    // set on success
        private String errorCode;
        private String errorMessage;    // set on failure
    }
}
