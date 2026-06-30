package com.demo.oms.repository;

import com.demo.oms.domain.ComplianceRule;
import com.demo.oms.enums.ComplianceRuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ComplianceRuleRepository extends JpaRepository<ComplianceRule, UUID> {

    @Query("SELECT r FROM ComplianceRule r WHERE r.active = true " +
           "AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :today) " +
           "AND (r.effectiveTo IS NULL OR r.effectiveTo >= :today)")
    List<ComplianceRule> findActiveRules(LocalDate today);

    List<ComplianceRule> findByRuleTypeAndActiveTrue(ComplianceRuleType type);
    List<ComplianceRule> findByScopeAndActiveTrue(String scope);
}
