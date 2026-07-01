package com.demo.oms.controller;

import com.demo.oms.domain.Trade;
import com.demo.oms.dto.*;
import com.demo.oms.service.SettlementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Settlement", description = "T+2 settlement tracking — pending, settled, failed trades")
@RestController
@RequestMapping("/api/v1/settlement")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @Operation(summary = "Settlement summary for an account")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<SettlementSummaryResponse>> getSummary(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(settlementService.getSummary(accountId)));
    }

    @Operation(summary = "Settlement summary for a specific settlement date (YYYY-MM-DD)")
    @GetMapping("/{accountId}/date/{settlementDate}")
    public ResponseEntity<ApiResponse<SettlementSummaryResponse>> getSummaryByDate(
            @PathVariable String accountId,
            @PathVariable String settlementDate) {
        return ResponseEntity.ok(ApiResponse.ok(settlementService.getSummaryForDate(accountId, settlementDate)));
    }

    @Operation(summary = "All pending settlements (broker/ops view)")
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Trade>>> getPending() {
        return ResponseEntity.ok(ApiResponse.ok(settlementService.getPendingSettlements()));
    }

    @Operation(summary = "Trigger manual settlement processing (ADMIN)")
    @PostMapping("/process")
    public ResponseEntity<ApiResponse<Integer>> processSettlements() {
        int count = settlementService.processMaturedSettlements();
        return ResponseEntity.ok(ApiResponse.ok(count + " trade(s) settled", count));
    }
}
