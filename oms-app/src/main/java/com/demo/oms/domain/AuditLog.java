package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_entity", columnList = "entityType,entityId"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_account", columnList = "accountId")
})
public class AuditLog {

    @Id
    private UUID id = UUID.randomUUID();

    private String entityType;    // ORDER, TRADE, ACCOUNT, POSITION, RISK_LIMIT
    private String entityId;
    private String action;        // CREATE, UPDATE, CANCEL, FILL, REJECT, AMEND, LOGIN, LOGOUT

    private String userId;
    private String accountId;

    @Column(length = 1000)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String previousState; // JSON snapshot before change

    @Column(columnDefinition = "TEXT")
    private String newState;      // JSON snapshot after change

    private String ipAddress;
    private String userAgent;
    private String sessionId;

    private LocalDateTime timestamp = LocalDateTime.now();
}
