package com.demo.oms.domain;

import com.demo.oms.enums.CorporateActionType;
import com.demo.oms.enums.ExchangeType;
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
@Table(name = "corporate_actions", indexes = {
    @Index(name = "idx_ca_symbol", columnList = "symbol"),
    @Index(name = "idx_ca_exdate", columnList = "exDate")
})
public class CorporateAction {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    private ExchangeType exchange;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CorporateActionType type;

    private LocalDate announcementDate;

    @Column(nullable = false)
    private LocalDate exDate;          // ex-entitlement date

    private LocalDate recordDate;      // shareholder record date
    private LocalDate paymentDate;     // cash payment / share credit date

    // CASH_DIVIDEND: dividend per share in BDT
    // BONUS_SHARE: ratio (e.g. 0.20 = 1 bonus for every 5 held = 20%)
    // STOCK_SPLIT: ratio (e.g. 2.0 = 2:1 split, double shares)
    // RIGHTS_ISSUE: subscription price per right share
    @Column(precision = 19, scale = 4)
    private BigDecimal ratio;

    // RIGHTS_ISSUE: entitlement ratio (e.g. 1 right per 4 shares held = 0.25)
    @Column(precision = 19, scale = 4)
    private BigDecimal rightsEntitlement;

    @Column(length = 500)
    private String description;

    private String announcedBy; // DSE/CSE/Company

    private boolean processed = false; // positions adjusted
    private LocalDateTime processedAt;

    private LocalDateTime createdAt = LocalDateTime.now();
}
