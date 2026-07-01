package com.demo.oms.service;

import com.demo.oms.domain.AuditLog;
import com.demo.oms.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class AuditService {

    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private ObjectMapper objectMapper;

    @Async
    public void log(String entityType, String entityId, String action,
                    String accountId, String description,
                    Object previousState, Object newState) {
        try {
            AuditLog entry = new AuditLog();
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setAction(action);
            entry.setAccountId(accountId);
            entry.setDescription(description);
            entry.setTimestamp(LocalDateTime.now());

            if (previousState != null) {
                entry.setPreviousState(objectMapper.writeValueAsString(previousState));
            }
            if (newState != null) {
                entry.setNewState(objectMapper.writeValueAsString(newState));
            }

            auditLogRepository.save(entry);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize audit log state", e);
        }
    }

    public List<AuditLog> getOrderAuditTrail(String orderId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("ORDER", orderId);
    }

    public List<AuditLog> getAccountAuditTrail(String accountId) {
        return auditLogRepository.findByAccountIdOrderByTimestampDesc(accountId);
    }
}
