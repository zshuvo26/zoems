package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.LatencyReportResponse;
import com.demo.oms.dto.SmartRouterResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.service.LatencyMonitorService;
import com.demo.oms.service.SmartOrderRouterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Tag(name = "EMS Analytics", description = "Latency monitoring and Smart Order Router")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/ems")
public class LatencyController {

    @Autowired private LatencyMonitorService latencyMonitorService;
    @Autowired private SmartOrderRouterService smartRouter;

    @Operation(summary = "Get latency report for all EMS components",
               description = "Returns p50/p95/p99 latency per component (OMS_EMS, EMS_GATEWAY, "
                           + "GATEWAY_EXCHANGE, EXCHANGE_GATEWAY, GATEWAY_OMS, END_TO_END) over the last N hours.")
    @GetMapping("/latency/report")
    public ResponseEntity<ApiResponse<LatencyReportResponse>> report(
            @RequestParam(defaultValue = "24") int periodHours) {
        return ResponseEntity.ok(ApiResponse.ok(latencyMonitorService.getReport(periodHours)));
    }

    @Operation(summary = "Record a latency measurement (for testing/simulation)")
    @PostMapping("/latency/record")
    public ResponseEntity<ApiResponse<Void>> record(
            @RequestParam String component,
            @RequestParam long latencyMs,
            @RequestParam(required = false) String orderId) {
        latencyMonitorService.record(component, latencyMs, orderId);
        return ResponseEntity.ok(ApiResponse.ok("Recorded", null));
    }

    @Operation(summary = "Smart Order Router — select optimal execution venue",
               description = "Scores all venues (DSE, CSE, OTC, DARK_POOL) based on liquidity, fees, latency "
                           + "and returns the optimal venue with rationale.")
    @GetMapping("/route")
    public ResponseEntity<ApiResponse<SmartRouterResponse>> route(
            @RequestParam String symbol,
            @RequestParam OrderSide side,
            @RequestParam BigDecimal quantity,
            @RequestParam(required = false) BigDecimal priceLimit) {
        SmartRouterResponse resp = smartRouter.selectVenue(symbol, side, quantity, priceLimit);
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }
}
