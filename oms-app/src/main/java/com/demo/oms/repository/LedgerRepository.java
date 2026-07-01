package com.demo.oms.repository;

import com.demo.oms.domain.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface LedgerRepository extends JpaRepository<LedgerEntry, String> {
    Page<LedgerEntry> findByAccountIdOrderByTimestampDesc(String accountId, Pageable pageable);

    @Query("SELECT e FROM LedgerEntry e WHERE e.accountId = :accountId ORDER BY e.timestamp DESC LIMIT 1")
    Optional<LedgerEntry> findLatestByAccountId(String accountId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM LedgerEntry e WHERE e.accountId = :accountId AND e.entryType = 'COMMISSION'")
    BigDecimal sumCommissionByAccount(String accountId);
}
