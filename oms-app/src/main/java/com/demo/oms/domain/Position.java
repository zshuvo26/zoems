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
@Table(name = "positions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"accountId", "symbol", "exchange"}),
    indexes = {
        @Index(name = "idx_pos_account", columnList = "accountId"),
        @Index(name = "idx_pos_symbol", columnList = "symbol")
    })
public class Position {

    @Id
    private UUID id = UUID.randomUUID();

    private String accountId;
    private String symbol;
    private String exchange;

    @Column(precision = 19, scale = 4)
    private BigDecimal netQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal longQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal shortQuantity = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal avgCostPrice = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal costBasis = BigDecimal.ZERO; // total cost of current position

    @Column(precision = 19, scale = 4)
    private BigDecimal currentMarketPrice = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal marketValue = BigDecimal.ZERO; // netQuantity * currentMarketPrice

    @Column(precision = 19, scale = 4)
    private BigDecimal unrealizedPnL = BigDecimal.ZERO; // marketValue - costBasis

    @Column(precision = 19, scale = 4)
    private BigDecimal unrealizedPnLPct = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal realizedPnL = BigDecimal.ZERO; // from closed/partial trades

    @Column(precision = 19, scale = 4)
    private BigDecimal totalPnL = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal dayPnL = BigDecimal.ZERO; // intraday P&L since previous close

    @Column(precision = 19, scale = 4)
    private BigDecimal previousClosePrice = BigDecimal.ZERO;

    private LocalDateTime lastUpdated = LocalDateTime.now();
}
