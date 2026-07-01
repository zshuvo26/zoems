package com.demo.oms.dto;

import lombok.Data;

import java.util.List;

@Data
public class BasketOrderRequest {
    private String basketName;
    private String accountId;
    private List<OrderRequest> orders;
    // When true, cancel all others if any one fails pre-trade risk
    private boolean allOrNone = false;
}
