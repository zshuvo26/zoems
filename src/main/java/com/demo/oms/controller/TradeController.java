package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.TradeResponse;
import com.demo.oms.service.TradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Trades", description = "Trade and execution report queries")
@RestController
@RequestMapping("/api/v1/trades")
public class TradeController {

    @Autowired private TradeService tradeService;

    @Operation(summary = "Get all trades for an account")
    @GetMapping("/account/{accountId}")
    public ResponseEntity<ApiResponse<List<TradeResponse>>> getTradesByAccount(
            @PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(
                tradeService.toResponses(tradeService.getTradesByAccount(accountId))));
    }

    @Operation(summary = "Get all fills for a specific order")
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<List<TradeResponse>>> getTradesByOrder(
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.ok(
                tradeService.toResponses(tradeService.getTradesByOrder(orderId))));
    }
}
