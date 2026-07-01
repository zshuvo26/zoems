package com.demo.oms.dto;

import com.demo.oms.domain.SavedBasket;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SavedBasketResponse {

    private UUID id;
    private String accountId;
    private String basketName;
    private String description;
    private String status;
    private boolean allOrNone;
    private int orderCount;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SavedBasketResponse from(SavedBasket b) {
        SavedBasketResponse r = new SavedBasketResponse();
        r.setId(b.getId());
        r.setAccountId(b.getAccountId());
        r.setBasketName(b.getBasketName());
        r.setDescription(b.getDescription());
        r.setStatus(b.getStatus());
        r.setAllOrNone(b.isAllOrNone());
        r.setOrderCount(b.getOrderCount());
        r.setScheduledAt(b.getScheduledAt());
        r.setCreatedAt(b.getCreatedAt());
        r.setUpdatedAt(b.getUpdatedAt());
        return r;
    }
}
