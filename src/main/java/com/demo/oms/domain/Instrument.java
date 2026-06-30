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
    private String symbol;

    private String name;
    private String shortName;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    private String board;
    private String isin;
    private String sector;
    private String industry;

    @Column(precision = 19, scale = 4)
    private BigDecimal lotSize = BigDecimal.ONE;

    @Column(precision = 19, scale = 4)
    private BigDecimal tickSize = new BigDecimal("0.10");

    @Column(precision = 19, scale = 4)
    private BigDecimal circuitBreakerUpperPct = new BigDecimal("10.00");

    @Column(precision = 19, scale = 4)
    private BigDecimal circuitBreakerLowerPct = new BigDecimal("10.00");

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

    @Column(precision = 19, scale = 4)
    private BigDecimal upperCircuitLimit;

    @Column(precision = 19, scale = 4)
    private BigDecimal lowerCircuitLimit;

    // Company fundamentals
    @Column(precision = 19, scale = 4)
    private BigDecimal faceValue = new BigDecimal("10.00");

    @Column(precision = 19, scale = 4)
    private BigDecimal marketCap;

    @Column(precision = 19, scale = 4)
    private BigDecimal listedShares;

    // 52-week range
    @Column(precision = 19, scale = 4)
    private BigDecimal weekHigh52;

    @Column(precision = 19, scale = 4)
    private BigDecimal weekLow52;

    // Valuation metrics
    @Column(precision = 10, scale = 2)
    private BigDecimal peRatio;

    @Column(precision = 19, scale = 4)
    private BigDecimal eps;

    @Column(precision = 10, scale = 2)
    private BigDecimal dividendYield;

    @Column(precision = 19, scale = 4)
    private BigDecimal bookValue;

    // Status flags
    private boolean tradeable = true;
    private boolean halted = false;
    private String haltReason;
    private boolean underCircuitBreaker = false;

    private LocalDateTime lastUpdated = LocalDateTime.now();

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
