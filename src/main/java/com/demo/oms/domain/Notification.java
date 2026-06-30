package com.demo.oms.domain;

import com.demo.oms.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notif_account", columnList = "accountId"),
    @Index(name = "idx_notif_read", columnList = "isRead")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    private String accountId;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String message;

    @JsonProperty("referenceId")
    private String relatedEntityId;

    @JsonProperty("isRead")
    private boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime readAt;
}
