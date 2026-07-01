package com.demo.oms.repository;

import com.demo.oms.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, String entityId);

    List<AuditLog> findByAccountIdOrderByTimestampDesc(String accountId);

    List<AuditLog> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime from, LocalDateTime to);
}
