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
@Table(name = "order_templates")
public class OrderTemplate {

    @Id
    private String id = UUID.randomUUID().toString();

    private String accountId;
    private String templateName;

    private String symbol;
    private String exchange;
    private String side;        // BUY / SELL
    private String orderType;   // LIMIT / MARKET / STOP_LIMIT / STOP_LOSS
    private String timeInForce; // DAY / GTC / IOC / FOK

    @Column(precision = 19, scale = 4)
    private BigDecimal price;

    @Column(precision = 19, scale = 4)
    private BigDecimal stopPrice;

    private Integer quantity;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
