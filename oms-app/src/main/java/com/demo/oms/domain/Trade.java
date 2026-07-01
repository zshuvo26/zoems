package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "trades", indexes = {
    @Index(name = "idx_trade_order_id", columnList = "orderId"),
    @Index(name = "idx_trade_account", columnList = "accountId"),
    @Index(name = "idx_trade_symbol", columnList = "symbol"),
    @Index(name = "idx_trade_time", columnList = "tradeTime")
})
public class Trade {

    @Id
    private UUID id = UUID.randomUUID();

    private String tradeId;        // exchange-assigned trade reference
    private UUID orderId;
    private String clientOrderId;
    private String accountId;
    private String traderId;
    private String brokerId;

    private String symbol;
    private String exchange;
    private String side;           // BUY or SELL

    @Column(precision = 19, scale = 4)
    private BigDecimal quantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal price;

    @Column(precision = 19, scale = 4)
    private BigDecimal grossValue;  // quantity * price

    @Column(precision = 19, scale = 4)
    private BigDecimal commission;

    @Column(precision = 19, scale = 4)
    private BigDecimal secFee;      // Bangladesh SEC levy

    @Column(precision = 19, scale = 4)
    private BigDecimal ait;         // Advance Income Tax (AIT) deducted at source

    @Column(precision = 19, scale = 4)
    private BigDecimal dseSmeFee;   // DSE/CSE transaction fee

    @Column(precision = 19, scale = 4)
    private BigDecimal netValue;    // grossValue - commission - secFee - ait

    private String currency = "BDT";

    private LocalDateTime tradeTime;
    private String settlementDate;  // T+2 business days
    private boolean settled = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
