package com.demo.oms.domain;

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
@Table(name = "ipo_applications", uniqueConstraints = @UniqueConstraint(columnNames = {"ipoId", "accountId"}))
public class IpoApplication {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String ipoId;

    @Column(nullable = false)
    private String accountId;

    private String symbol;
    private int appliedLots;
    private int lotSize;

    @Column(precision = 19, scale = 4)
    private BigDecimal issuePrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal amountPaid;   // appliedLots × lotSize × issuePrice

    private int allottedLots = 0;

    @Column(precision = 19, scale = 4)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    // PENDING, ALLOTTED, NOT_ALLOTTED, REFUNDED
    private String status = "PENDING";

    private LocalDate applicationDate = LocalDate.now();
    private LocalDate allotmentDate;
    private LocalDateTime createdAt = LocalDateTime.now();
}
