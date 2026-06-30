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
@Table(name = "risk_limits")
public class RiskLimit {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(unique = true)
    private String accountId;

    // Per-order limits
    @Column(precision = 19, scale = 4)
    private BigDecimal maxOrderValue = new BigDecimal("1000000");    // BDT 10 lakh per order

    @Column(precision = 19, scale = 4)
    private BigDecimal maxOrderQuantity = new BigDecimal("10000");   // max shares per order

    // Position limits
    @Column(precision = 19, scale = 4)
    private BigDecimal maxPositionValue = new BigDecimal("10000000"); // BDT 1 crore total portfolio

    @Column(precision = 19, scale = 4)
    private BigDecimal maxExposurePerSymbol = new BigDecimal("2000000"); // BDT 20 lakh per stock

    @Column(precision = 19, scale = 4)
    private BigDecimal maxExposurePct = new BigDecimal("25");        // max 25% in one stock

    // Daily limits
    @Column(precision = 19, scale = 4)
    private BigDecimal maxDailyTurnover = new BigDecimal("5000000"); // BDT 50 lakh per day

    @Column(precision = 19, scale = 4)
    private BigDecimal maxDailyLoss = new BigDecimal("100000");      // stop trading at BDT 1 lakh loss

    private int maxOrdersPerDay = 100;

    // Feature flags
    private boolean enableShortSelling = false;  // requires BSEC approval
    private boolean enableMargin = false;

    @Column(precision = 19, scale = 4)
    private BigDecimal marginMultiplier = BigDecimal.ONE;  // 1x = no leverage

    private boolean active = true;
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
