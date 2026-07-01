package com.demo.oms.dto;

import com.demo.oms.domain.AuditLog;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderAuditResponse {

    private String id;
    private String eventType;       // mirrors AuditLog.action
    private String status;          // same value — mobile reads either field
    private String message;         // from AuditLog.description
    private String timestamp;
    private BigDecimal filledQty;
    private BigDecimal avgFillPrice;
    private String rejectionReason;
    private String previousState;
    private String newState;

    public static OrderAuditResponse from(AuditLog log) {
        OrderAuditResponse r = new OrderAuditResponse();
        r.setId(log.getId().toString());
        r.setEventType(log.getAction());
        r.setStatus(log.getAction());
        r.setMessage(log.getDescription());
        r.setTimestamp(log.getTimestamp().toString());
        r.setPreviousState(log.getPreviousState());
        r.setNewState(log.getNewState());
        return r;
    }
}
