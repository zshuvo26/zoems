package com.demo.oms.domain;

import com.demo.oms.enums.AssetClass;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "parent_orders", indexes = {
    @Index(name = "idx_po_account", columnList = "accountId"),
    @Index(name = "idx_po_symbol",  columnList = "symbol")
})
public class ParentOrder {

    @Id
    private UUID id = UUID.randomUUID();

    private String accountId;
    private String boid;
    private String dealerId;

    private String symbol;
    private String isin;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    @Enumerated(EnumType.STRING)
    private AssetClass assetClass = AssetClass.EQUITY;

    @Enumerated(EnumType.STRING)
    private OrderSide side;

    @Column(precision = 19, scale = 4)
    private BigDecimal totalQuantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal executedQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal remainingQuantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal priceLimit;      // null = market

    private int numSlices;              // target number of child orders
    private int completedSlices = 0;

    // PENDING / ACTIVE / COMPLETED / CANCELLED
    private String status = "PENDING";

    private String notes;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = LocalDateTime.now(); }
}
