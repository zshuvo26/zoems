package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    private String id;              // BO Account Number (e.g., 1201880012345678)

    private String name;
    private String email;
    private String phone;
    private String nationalId;      // NID for Bangladesh KYC

    private String traderId;
    private String brokerId;
    private String brokerName;

    // Account type per BSEC classification
    private String accountType;     // INDIVIDUAL, CORPORATE, NRB (Non-Resident Bangladeshi), FPI

    // Fund balances (BDT)
    @Column(precision = 19, scale = 4)
    private BigDecimal cashBalance = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal blockedAmount = BigDecimal.ZERO; // blocked for open buy orders

    @Column(precision = 19, scale = 4)
    private BigDecimal availableFunds = BigDecimal.ZERO; // cashBalance - blockedAmount

    // Portfolio metrics
    @Column(precision = 19, scale = 4)
    private BigDecimal portfolioValue = BigDecimal.ZERO; // current market value of holdings

    @Column(precision = 19, scale = 4)
    private BigDecimal totalEquity = BigDecimal.ZERO;    // availableFunds + portfolioValue

    @Column(precision = 19, scale = 4)
    private BigDecimal totalPnL = BigDecimal.ZERO;

    @Column(precision = 19, scale = 4)
    private BigDecimal dayPnL = BigDecimal.ZERO;

    // Limits
    @Column(precision = 19, scale = 4)
    private BigDecimal creditLimit = BigDecimal.ZERO;    // margin credit if applicable

    private boolean active = true;
    private boolean tradingEnabled = true;
    private boolean marginEnabled = false;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
