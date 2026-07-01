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
@Table(name = "price_alerts", indexes = {
    @Index(name = "idx_alert_account", columnList = "accountId"),
    @Index(name = "idx_alert_symbol",  columnList = "symbol,exchange")
})
public class PriceAlert {

    @Id
    private String id = UUID.randomUUID().toString();

    private String accountId;
    private String symbol;
    private String exchange;

    // ABOVE = trigger when price >= targetPrice
    // BELOW = trigger when price <= targetPrice
    // PCT_UP / PCT_DOWN = trigger on % change from prevClose
    @Enumerated(EnumType.STRING)
    private AlertCondition condition;

    @Column(precision = 19, scale = 4)
    private BigDecimal targetPrice;

    // For PCT_UP / PCT_DOWN: the % threshold (e.g. 5.0 = 5%)
    @Column(precision = 10, scale = 2)
    private BigDecimal percentThreshold;

    private boolean active    = true;
    private boolean triggered = false;

    private LocalDateTime triggeredAt;
    private LocalDateTime createdAt = LocalDateTime.now();

    private String note; // optional label set by user

    public enum AlertCondition { ABOVE, BELOW, PCT_UP, PCT_DOWN }
}
