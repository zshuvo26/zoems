package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.SavedBasketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Saved Baskets", description = "Named basket templates: save, load, clone, approve, schedule, execute")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/saved-baskets")
public class SavedBasketController {

    @Autowired private SavedBasketService basketService;

    @Operation(summary = "Save a new basket template")
    @PostMapping
    public ResponseEntity<ApiResponse<SavedBasketResponse>> save(@RequestBody Map<String, Object> body) {
        String accountId  = (String) body.get("accountId");
        String basketName = (String) body.get("basketName");
        String desc       = (String) body.getOrDefault("description", "");
        boolean allOrNone = Boolean.TRUE.equals(body.get("allOrNone"));
        @SuppressWarnings("unchecked")
        List<OrderRequest> orders = (List<OrderRequest>) body.getOrDefault("orders", List.of());
        SavedBasketResponse resp = basketService.save(accountId, basketName, desc, allOrNone, orders);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Basket saved", resp));
    }

    @Operation(summary = "List saved baskets for an account")
    @GetMapping("/account/{accountId}")
    public ResponseEntity<ApiResponse<List<SavedBasketResponse>>> list(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(basketService.list(accountId)));
    }

    @Operation(summary = "Get a saved basket by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SavedBasketResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(basketService.get(id)));
    }

    @Operation(summary = "Execute a saved basket — submits all orders")
    @PostMapping("/{id}/execute")
    public ResponseEntity<ApiResponse<BasketOrderResult>> execute(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Basket executed", basketService.execute(id)));
    }

    @Operation(summary = "Approve a basket — moves from DRAFT to APPROVED")
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SavedBasketResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Basket approved", basketService.approve(id)));
    }

    @Operation(summary = "Schedule a basket for future execution")
    @PostMapping("/{id}/schedule")
    public ResponseEntity<ApiResponse<SavedBasketResponse>> schedule(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledAt) {
        return ResponseEntity.ok(ApiResponse.ok("Basket scheduled", basketService.schedule(id, scheduledAt)));
    }

    @Operation(summary = "Clone a basket with a new name")
    @PostMapping("/{id}/clone")
    public ResponseEntity<ApiResponse<SavedBasketResponse>> clone(
            @PathVariable UUID id,
            @RequestParam String newName) {
        return ResponseEntity.ok(ApiResponse.ok("Basket cloned", basketService.clone(id, newName)));
    }

    @Operation(summary = "Delete a saved basket")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        basketService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Basket deleted", null));
    }
}
