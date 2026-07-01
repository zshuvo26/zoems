package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "saved_baskets", indexes = {
    @Index(name = "idx_sb_account", columnList = "accountId")
})
public class SavedBasket {

    @Id
    private UUID id = UUID.randomUUID();

    private String accountId;

    @Column(nullable = false, length = 100)
    private String basketName;

    @Column(length = 500)
    private String description;

    // DRAFT / APPROVED / SCHEDULED / EXECUTED
    private String status = "DRAFT";

    private boolean allOrNone = false;

    private LocalDateTime scheduledAt;  // non-null when status=SCHEDULED

    @Column(columnDefinition = "TEXT")
    private String ordersJson;          // JSON-serialized List<OrderRequest>

    private int orderCount = 0;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = LocalDateTime.now(); }
}
