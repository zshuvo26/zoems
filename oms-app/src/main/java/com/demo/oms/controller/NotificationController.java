package com.demo.oms.controller;

import com.demo.oms.domain.Notification;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Notifications", description = "In-app alerts — order fills, price alerts, corporate actions, margin calls")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Get all notifications for an account")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<List<Notification>>> getAll(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getNotifications(accountId)));
    }

    @Operation(summary = "Get unread notifications only")
    @GetMapping("/{accountId}/unread")
    public ResponseEntity<ApiResponse<List<Notification>>> getUnread(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getUnread(accountId)));
    }

    @Operation(summary = "Get unread notification count")
    @GetMapping("/{accountId}/count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getCount(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "unread", notificationService.getUnreadCount(accountId),
                "total",  notificationService.getTotalCount(accountId)
        )));
    }

    @Operation(summary = "Mark a single notification as read")
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable Long notificationId) {
        notificationService.markRead(notificationId);
        return ResponseEntity.ok(ApiResponse.ok("Marked as read", null));
    }

    @Operation(summary = "Mark all notifications as read for an account")
    @PostMapping("/{accountId}/mark-all-read")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllRead(@PathVariable String accountId) {
        int count = notificationService.markAllRead(accountId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("marked", count)));
    }
}
