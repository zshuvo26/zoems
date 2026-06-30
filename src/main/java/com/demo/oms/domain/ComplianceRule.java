package com.demo.oms.domain;

import com.demo.oms.enums.ComplianceRuleType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "compliance_rules")
public class ComplianceRule {

    @Id
    private UUID id = UUID.randomUUID();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplianceRuleType ruleType;

    // Scope: "GLOBAL", "ACCOUNT:{accountId}", "SYMBOL:{GP}", "SECTOR:{PHARMA}"
    @Column(nullable = false)
    private String scope = "GLOBAL";

    // Rule parameter value as string (e.g. "30" minutes for wash trade, "0" for restricted)
    private String ruleValue;

    @Column(length = 500)
    private String description;

    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;      // null = indefinite

    private boolean active = true;
    private String createdBy;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = LocalDateTime.now(); }
}
