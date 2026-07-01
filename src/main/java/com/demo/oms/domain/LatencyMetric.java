package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "latency_metrics", indexes = {
    @Index(name = "idx_lm_component",  columnList = "component"),
    @Index(name = "idx_lm_timestamp",  columnList = "timestamp")
})
public class LatencyMetric {

    @Id
    private UUID id = UUID.randomUUID();

    // OMS_EMS | EMS_GATEWAY | GATEWAY_EXCHANGE | EXCHANGE_GATEWAY | GATEWAY_OMS | END_TO_END
    @Column(nullable = false, length = 30)
    private String component;

    private long latencyMs;

    private String orderId;

    private boolean alert = false;  // true when latencyMs > threshold

    private LocalDateTime timestamp = LocalDateTime.now();
}
