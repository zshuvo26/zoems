package com.demo.oms.repository;

import com.demo.oms.domain.RiskLimit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RiskLimitRepository extends JpaRepository<RiskLimit, UUID> {

    Optional<RiskLimit> findByAccountId(String accountId);
}
