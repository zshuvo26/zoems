package com.demo.oms.domain;

import com.demo.oms.enums.*;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_client_order_id", columnList = "clientOrderId"),
    @Index(name = "idx_symbol", columnList = "symbol"),
    @Index(name = "idx_account_id", columnList = "accountId"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_created_at", columnList = "createdAt")
})
public class Order {

    @Id
    private UUID id = UUID.randomUUID();

    // FIX identifiers
    private String clientOrderId;
    private String origClientOrderId; // for cancel/replace chains
    private String brokerOrderId;     // from broker/gateway
    private String exchangeOrderId;   // exchange-assigned reference

    // Participants
    private String accountId;         // BO Account Number
    private String traderId;
    private String brokerId;

    // Instrument
    private String symbol;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    private String board; // A, B, Z, SME, G (DSE board categories)

    // Order classification
    @Enumerated(EnumType.STRING)
    private OrderSide side;

    @Enumerated(EnumType.STRING)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    private TimeInForce timeInForce = TimeInForce.DAY;

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.NEW;

    // Quantities
    @Column(precision = 19, scale = 4)
    private BigDecimal quantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal displayQuantity; // iceberg visible quantity

    @Column(precision = 19, scale = 4)
    private BigDecimal filledQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal remainingQuantity;

    // Prices
    @Column(precision = 19, scale = 4)
    private BigDecimal price;

    @Column(precision = 19, scale = 4)
    private BigDecimal stopPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal avgFillPrice;

    // Financials (in BDT)
    @Column(precision = 19, scale = 4)
    private BigDecimal grossValue;     // quantity * price

    @Column(precision = 19, scale = 4)
    private BigDecimal commission;

    @Column(precision = 19, scale = 4)
    private BigDecimal tax;            // SEC fee + AIT + stamp duty

    @Column(precision = 19, scale = 4)
    private BigDecimal netValue;       // grossValue + commission + tax

    private String currency = "BDT";

    // Reason / notes
    private String rejectionReason;
    private String cancelReason;

    @Column(length = 500)
    private String text;

    // Order source
    private String source; // ONLINE, MOBILE, API, PHONE, DEALER

    private boolean isManual = false;

    // Settlement (T+2 in BD)
    private String settlementDate;
    private boolean settled = false;

    // Timestamps
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
    private LocalDateTime transactTime;
    private LocalDate expireDate; // for GTD orders

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
