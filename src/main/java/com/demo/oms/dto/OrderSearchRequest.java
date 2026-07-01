package com.demo.oms.dto;

import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class OrderSearchRequest {
    private String accountId;
    private String symbol;
    private String isin;
    private String boid;
    private String dealerId;
    private ExchangeType exchange;
    private OrderStatus status;
    private OrderSide side;
    private LocalDate dateFrom;
    private LocalDate dateTo;
}
