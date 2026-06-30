package com.demo.oms.domain;

import com.demo.oms.enums.ExchangeType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "instruments", indexes = {
    @Index(name = "idx_inst_exchange", columnList = "exchange"),
    @Index(name = "idx_inst_sector", columnList = "sector")
})
public class Instrument {

    @Id
    private String symbol;          // e.g., SQURPHARMA, GP, BRACBANK

    private String name;            // full company name
    private String shortName;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    private String board;           // A (main), B, Z (junk), N (new), SME, G (govt)
    private String isin;            // BD ISIN (e.g., BD0001SQPH05)
    private String sector;
    private String industry;

    @Column(precision = 19, scale = 4)
    private BigDecimal lotSize = BigDecimal.ONE;  // minimum tradeable unit

    @Column(precision = 19, scale = 4)
    private BigDecimal tickSize = new BigDecimal("0.10"); // minimum price increment

    // Circuit breaker limits (BSEC mandated: ±10% individual stock)
    @Column(precision = 19, scale = 4)
    private BigDecimal circuitBreakerUpperPct = new BigDecimal("10.00");

    @Column(precision = 19, scale = 4)
    private BigDecimal circuitBreakerLowerPct = new BigDecimal("10.00");

    // Today's price data (updated by market data service)
    @Column(precision = 19, scale = 4)
    private BigDecimal previousClose;

    @Column(precision = 19, scale = 4)
    private BigDecimal openPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal highPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal lowPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal lastPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal bidPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal askPrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal volume;

    @Column(precision = 19, scale = 4)
    private BigDecimal tradedValue;

    // Computed circuit limits
    @Column(precision = 19, scale = 4)
    private BigDecimal upperCircuitLimit;  // previousClose * (1 + upperPct/100)

    @Column(precision = 19, scale = 4)
    private BigDecimal lowerCircuitLimit;  // previousClose * (1 - lowerPct/100)

    // Company fundamentals
    @Column(precision = 19, scale = 4)
    private BigDecimal faceValue = new BigDecimal("10.00"); // par value in BDT

    @Column(precision = 19, scale = 4)
    private BigDecimal marketCap;

    @Column(precision = 19, scale = 4)
    private BigDecimal listedShares;

    // Status flags
    private boolean tradeable = true;
    private boolean halted = false;
    private String haltReason;
    private boolean underCircuitBreaker = false;

    private LocalDateTime lastUpdated = LocalDateTime.now();

    // Computed change fields — not persisted, calculated after load
    @Transient private BigDecimal change;
    @Transient private BigDecimal changePct;

    @PostLoad
    @PrePersist
    @PreUpdate
    public void computeChange() {
        if (lastPrice != null && previousClose != null && previousClose.compareTo(BigDecimal.ZERO) != 0) {
            this.change = lastPrice.subtract(previousClose).setScale(2, RoundingMode.HALF_UP);
            this.changePct = this.change.divide(previousClose, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
        } else {
            this.change = BigDecimal.ZERO;
            this.changePct = BigDecimal.ZERO;
        }
    }
}
