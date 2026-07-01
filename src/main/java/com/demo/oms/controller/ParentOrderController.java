package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.ParentOrderRequest;
import com.demo.oms.dto.ParentOrderResponse;
import com.demo.oms.service.OrderService;
import com.demo.oms.service.ParentOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Parent Orders", description = "Split large institutional orders into child slices")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/parent-orders")
public class ParentOrderController {

    @Autowired private ParentOrderService parentOrderService;
    @Autowired private OrderService orderService;

    @Operation(summary = "Create a parent order and split into child orders",
               description = "Splits totalQuantity into numSlices child limit/market orders. "
                           + "Each child order is independently routed via FIX.")
    @PostMapping
    public ResponseEntity<ApiResponse<ParentOrderResponse>> create(@Valid @RequestBody ParentOrderRequest req) {
        ParentOrderResponse resp = parentOrderService.createParentOrder(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Parent order created with " + resp.getChildren().size() + " slices", resp));
    }

    @Operation(summary = "Get parent order with children")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ParentOrderResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(parentOrderService.get(id, orderService)));
    }

    @Operation(summary = "List all parent orders for an account")
    @GetMapping("/account/{accountId}")
    public ResponseEntity<ApiResponse<List<ParentOrderResponse>>> getByAccount(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(parentOrderService.getByAccount(accountId)));
    }
}
