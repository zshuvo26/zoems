package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderStatus;
import com.demo.oms.service.AuditService;
import com.demo.oms.service.OrderService;
import org.springframework.format.annotation.DateTimeFormat;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Orders", description = "Order lifecycle management — submit, cancel, amend, query, audit trail")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @Autowired private OrderService orderService;
    @Autowired private AuditService auditService;

    @Operation(
        summary = "Submit a new order",
        description = "Submit a new limit/market/stop order to DSE or CSE via FIX 4.4. "
            + "Each order passes through (1) compliance pre-check, (2) pre-trade risk validation, "
            + "(3) FIX routing to exchange gateway. "
            + "Roles: ADMIN, DEALER, TRADER"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Order submitted — initial status is PENDING_NEW"),
        @ApiResponse(responseCode = "400", description = "Validation error — missing required field"),
        @ApiResponse(responseCode = "401", description = "Authentication required"),
        @ApiResponse(responseCode = "403", description = "Insufficient role — VIEWER cannot submit orders"),
        @ApiResponse(responseCode = "422", description = "Business rule violation: risk limit, circuit breaker, or compliance block")
    })
    @PostMapping
    public ResponseEntity<com.demo.oms.dto.ApiResponse<OrderResponse>> submitOrder(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Order details. Required: accountId, symbol, exchange, side, orderType, quantity. "
                    + "price required for LIMIT/STOP_LIMIT orders.",
                content = @Content(examples = {
                    @ExampleObject(name = "Limit Buy — GP",
                        value = "{\"accountId\":\"1201880012345678\",\"symbol\":\"GP\",\"exchange\":\"DSE\","
                              + "\"side\":\"BUY\",\"orderType\":\"LIMIT\",\"quantity\":10,\"price\":305.00,\"timeInForce\":\"DAY\"}"),
                    @ExampleObject(name = "Market Sell — SQURPHARMA",
                        value = "{\"accountId\":\"1201880012345678\",\"symbol\":\"SQURPHARMA\",\"exchange\":\"DSE\","
                              + "\"side\":\"SELL\",\"orderType\":\"MARKET\",\"quantity\":5}"),
                    @ExampleObject(name = "Institutional Limit Buy — BRACBANK",
                        value = "{\"accountId\":\"1201880087654321\",\"symbol\":\"BRACBANK\",\"exchange\":\"DSE\","
                              + "\"side\":\"BUY\",\"orderType\":\"LIMIT\",\"quantity\":500,\"price\":44.00,\"timeInForce\":\"GTC\"}")
                })
            )
            @Valid @RequestBody OrderRequest request) {
        OrderResponse order = orderService.submitOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(com.demo.oms.dto.ApiResponse.ok("Order submitted", order));
    }

    @Operation(
        summary = "Get order by ID",
        description = "Retrieve a single order by UUID. Returns current status, fill quantity, "
            + "average fill price, and rejection reason if applicable."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Order found"),
        @ApiResponse(responseCode = "404", description = "Order not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<OrderResponse>> getOrder(
            @Parameter(description = "Order UUID", example = "44063dec-26e2-4851-8b0f-ebab8b5d70a4")
            @PathVariable String id) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(orderService.getOrder(id)));
    }

    @Operation(
        summary = "Cancel an order",
        description = "Send a cancel request. Order must be in a cancellable state: "
            + "NEW, PENDING_NEW, ACKNOWLEDGED, or PARTIALLY_FILLED. "
            + "Transitions to PENDING_CANCEL; exchange confirms via FIX ExecType=CANCELLED. "
            + "Roles: ADMIN, DEALER, TRADER (own account only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Cancel request sent — status is PENDING_CANCEL"),
        @ApiResponse(responseCode = "404", description = "Order not found"),
        @ApiResponse(responseCode = "422", description = "Order cannot be cancelled (already FILLED, CANCELLED, or REJECTED)")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<OrderResponse>> cancelOrder(
            @Parameter(description = "Order UUID") @PathVariable String id,
            @RequestBody(required = false) CancelOrderRequest req) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok("Cancel request sent",
                orderService.cancelOrder(id, req)));
    }

    @Operation(
        summary = "Amend an order (cancel/replace)",
        description = "Amend the quantity or price of an open order via FIX Cancel/Replace (35=G). "
            + "Amendable states: NEW, PENDING_NEW, ACKNOWLEDGED, PARTIALLY_FILLED. "
            + "Roles: ADMIN, DEALER, TRADER (own account only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Amend request sent — status is PENDING_REPLACE"),
        @ApiResponse(responseCode = "400", description = "New quantity must be > filled quantity"),
        @ApiResponse(responseCode = "422", description = "Order not in amendable state")
    })
    @PatchMapping("/{id}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<OrderResponse>> amendOrder(
            @Parameter(description = "Order UUID") @PathVariable String id,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                content = @Content(examples = {
                    @ExampleObject(name = "Amend Quantity", value = "{\"newQuantity\": 20}"),
                    @ExampleObject(name = "Amend Price", value = "{\"newPrice\": 310.00}"),
                    @ExampleObject(name = "Amend Both", value = "{\"newQuantity\": 15, \"newPrice\": 308.50}")
                })
            )
            @Valid @RequestBody AmendOrderRequest req) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok("Amend request sent",
                orderService.amendOrder(id, req)));
    }

    @Operation(
        summary = "Get all orders for an account",
        description = "Returns orders for the account, newest first. Optionally filter by status."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Order list"),
        @ApiResponse(responseCode = "404", description = "Account not found")
    })
    @GetMapping("/account/{accountId}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<OrderResponse>>> getOrdersByAccount(
            @Parameter(description = "BO Account number", example = "1201880012345678")
            @PathVariable String accountId,
            @Parameter(description = "Filter by status: NEW, PENDING_NEW, ACKNOWLEDGED, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED")
            @RequestParam(required = false) OrderStatus status) {
        List<OrderResponse> orders = status != null
                ? orderService.getOrdersByStatus(accountId, status)
                : orderService.getOrdersByAccount(accountId);
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(orders));
    }

    @Operation(
        summary = "Get open orders for an account",
        description = "Returns only open orders: NEW, PENDING_NEW, ACKNOWLEDGED, PARTIALLY_FILLED, PENDING_CANCEL, PENDING_REPLACE."
    )
    @GetMapping("/account/{accountId}/open")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<OrderResponse>>> getOpenOrders(
            @Parameter(description = "BO Account number", example = "1201880012345678")
            @PathVariable String accountId) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(orderService.getOpenOrders(accountId)));
    }

    @Operation(
        summary = "Get audit trail for an order",
        description = "Returns full FIX message audit trail — all status transitions with timestamps and FIX message details."
    )
    @GetMapping("/{id}/audit")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<OrderAuditResponse>>> getOrderAudit(
            @Parameter(description = "Order UUID") @PathVariable String id) {
        List<OrderAuditResponse> trail = auditService.getOrderAuditTrail(id).stream()
                .map(OrderAuditResponse::from)
                .toList();
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(trail));
    }

    @Operation(
        summary = "Search orders with multi-field filters",
        description = "Search by accountId, symbol, ISIN, BOID, dealerId, exchange, status, side, date range. "
            + "All parameters optional — combine freely."
    )
    @GetMapping("/search")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<OrderResponse>>> search(
            @Parameter(description = "BO Account number") @RequestParam(required = false) String accountId,
            @Parameter(description = "Instrument symbol") @RequestParam(required = false) String symbol,
            @Parameter(description = "ISIN")             @RequestParam(required = false) String isin,
            @Parameter(description = "BOID")             @RequestParam(required = false) String boid,
            @Parameter(description = "Dealer ID")        @RequestParam(required = false) String dealerId,
            @Parameter(description = "Exchange")         @RequestParam(required = false) ExchangeType exchange,
            @Parameter(description = "Order status")     @RequestParam(required = false) OrderStatus status,
            @Parameter(description = "Side")             @RequestParam(required = false) OrderSide side,
            @Parameter(description = "From date (yyyy-MM-dd)") @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateFrom,
            @Parameter(description = "To date (yyyy-MM-dd)")   @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateTo) {
        OrderSearchRequest req = new OrderSearchRequest();
        req.setAccountId(accountId);
        req.setSymbol(symbol);
        req.setIsin(isin);
        req.setBoid(boid);
        req.setDealerId(dealerId);
        req.setExchange(exchange);
        req.setStatus(status);
        req.setSide(side);
        req.setDateFrom(dateFrom);
        req.setDateTo(dateTo);
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(orderService.searchOrders(req)));
    }

    @Operation(
        summary = "Bulk cancel multiple orders",
        description = "Cancels a list of order IDs in a single call. Orders that cannot be cancelled are skipped."
    )
    @PostMapping("/bulk-cancel")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<OrderResponse>>> bulkCancel(
            @Valid @RequestBody BulkCancelRequest req) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(
                "Bulk cancel processed", orderService.bulkCancel(req)));
    }

    @Operation(
        summary = "Clone an existing order",
        description = "Copies all order parameters and submits as a fresh order."
    )
    @PostMapping("/{id}/clone")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<OrderResponse>> clone(
            @Parameter(description = "Order UUID to clone") @PathVariable String id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(com.demo.oms.dto.ApiResponse.ok("Order cloned", orderService.cloneOrder(id)));
    }
}
