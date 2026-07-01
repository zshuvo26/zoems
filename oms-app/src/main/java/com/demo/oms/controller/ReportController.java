package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.RegulatoryReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Regulatory Reporting", description = "BSEC-mandated daily trade report and open position report — required for regulatory submission")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final RegulatoryReportingService reportService;

    @Operation(
        summary = "BSEC daily trade report",
        description = """
            Generates the BSEC-mandated daily trade report for a given exchange and date.

            **Submitted to:** Bangladesh Securities and Exchange Commission (BSEC)

            **Report includes per trade:**
            - Trade ID, account, symbol, side, quantity, price
            - Gross value, brokerage fee, SEC levy, AIT (sell only), DSE/CSE fee
            - Net settlement value
            - Settlement date (T+2)

            **Summary totals:**
            - Total trades, total volume, total traded value, total fees collected

            **Roles:** ADMIN, DEALER
            """
    )
    @GetMapping("/daily-trade")
    public ResponseEntity<ApiResponse<BsecReportResponse>> getDailyTradeReport(
            @Parameter(description = "Exchange: DSE or CSE", example = "DSE")
            @RequestParam(defaultValue = "DSE") String exchange,
            @Parameter(description = "Trade date (defaults to today). Format: YYYY-MM-DD", example = "2026-06-24")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(reportService.generateDailyTradeReport(exchange, reportDate)));
    }

    @Operation(
        summary = "BSEC open position report",
        description = """
            Generates the open position report showing all current holdings across all accounts.
            Used for regulatory position limit monitoring and beneficial ownership reporting.

            **Roles:** ADMIN
            """
    )
    @GetMapping("/positions")
    public ResponseEntity<ApiResponse<BsecReportResponse>> getPositionReport(
            @Parameter(description = "As-of date (defaults to today). Format: YYYY-MM-DD", example = "2026-06-24")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(reportService.generatePositionReport(reportDate)));
    }
}
