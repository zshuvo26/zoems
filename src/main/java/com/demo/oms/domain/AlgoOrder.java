package com.demo.oms.domain;

import com.demo.oms.enums.*;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "algo_orders", indexes = {
    @Index(name = "idx_algo_account", columnList = "accountId"),
    @Index(name = "idx_algo_status", columnList = "status")
})
public class AlgoOrder {

    @Id
    private UUID id = UUID.randomUUID();

    private String accountId;
    private String symbol;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    @Enumerated(EnumType.STRING)
    private OrderSide side;

    @Enumerated(EnumType.STRING)
    private AlgoType algoType;

    @Enumerated(EnumType.STRING)
    private AlgoStatus status = AlgoStatus.PENDING;

    @Column(precision = 19, scale = 4)
    private BigDecimal totalQuantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal executedQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal remainingQuantity;

    // TWAP/VWAP: limit price cap (buy) or floor (sell)
    @Column(precision = 19, scale = 4)
    private BigDecimal priceLimit;

    // TWAP: interval between slices in seconds
    private Integer sliceIntervalSeconds = 300; // 5 minutes default

    // POV: participation rate (0.0–1.0), e.g. 0.10 = 10% of market volume
    @Column(precision = 5, scale = 4)
    private BigDecimal participationRate;

    // IS: benchmark price at order creation (arrival price)
    @Column(precision = 19, scale = 4)
    private BigDecimal arrivalPrice;

    private LocalDateTime startTime;   // earliest execution time
    private LocalDateTime endTime;     // must complete by (deadline)

    private int totalSlices;           // total number of child slices planned
    private int completedSlices = 0;   // slices submitted so far
    private LocalDateTime lastSliceAt;

    // Execution stats
    @Column(precision = 19, scale = 4)
    private BigDecimal avgExecutedPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal implementationShortfall; // IS algo metric

    private String cancelReason;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = LocalDateTime.now(); }
}
