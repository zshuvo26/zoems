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
@Table(name = "ledger_entries", indexes = {
    @Index(name = "idx_ledger_account", columnList = "accountId"),
    @Index(name = "idx_ledger_ts",      columnList = "timestamp")
})
public class LedgerEntry {

    @Id
    private String id = UUID.randomUUID().toString();

    private String accountId;

    // DEPOSIT, WITHDRAWAL, BUY, SELL, COMMISSION, DIVIDEND, IPO_ALLOTMENT,
    // IPO_REFUND, RIGHTS_SUBSCRIPTION, BONUS_CREDIT
    private String entryType;

    // positive = credit, negative = debit
    @Column(precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(precision = 19, scale = 4)
    private BigDecimal balanceAfter;

    private String description;
    private String referenceId; // order ID, IPO ID, corporate action ID

    private String symbol;   // null for DEPOSIT/WITHDRAWAL
    private String exchange;

    private LocalDateTime timestamp = LocalDateTime.now();
}
