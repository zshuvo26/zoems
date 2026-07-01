package com.demo.oms.dto;

import com.demo.oms.enums.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class OrderResponse {

    private UUID id;
    private String clientOrderId;
    private String exchangeOrderId;
    private String accountId;
    private String boid;
    private String dealerId;
    private String dealerName;
    private String symbol;
    private String isin;
    private ExchangeType exchange;
    private AssetClass assetClass;
    private String board;
    private OrderSide side;
    private OrderType orderType;
    private TimeInForce timeInForce;
    private SettlementType settlementType;
    private OrderStatus status;
    private BigDecimal quantity;
    private BigDecimal filledQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal price;
    private BigDecimal stopPrice;
    private BigDecimal avgFillPrice;
    private BigDecimal grossValue;
    private BigDecimal commission;
    private BigDecimal tax;
    private BigDecimal netValue;
    private String currency;
    private String rejectionReason;
    private String cancelReason;
    private String text;
    private String remarks;
    private String dealerNotes;
    private String source;
    private UUID parentOrderId;
    private String settlementDate;
    private boolean settled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime transactTime;
}
