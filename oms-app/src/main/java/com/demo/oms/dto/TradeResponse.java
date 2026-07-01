package com.demo.oms.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TradeResponse {
    private UUID id;
    private String tradeId;
    private UUID orderId;
    private String clientOrderId;
    private String accountId;
    private String symbol;
    private String exchange;
    private String side;
    private BigDecimal quantity;
    private BigDecimal price;
    private BigDecimal grossValue;
    private BigDecimal commission;
    private BigDecimal secFee;
    private BigDecimal ait;
    private BigDecimal netValue;
    private String currency;
    private LocalDateTime tradeTime;
    private String settlementDate;
    private boolean settled;
}
