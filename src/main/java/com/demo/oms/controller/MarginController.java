package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.MarginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Margin Trading", description = "Margin utilization, buying power, margin call status")
@RestController
@RequestMapping("/api/v1/margin")
@RequiredArgsConstructor
public class MarginController {

    private final MarginService marginService;

    @Operation(summary = "Get margin status for an account — utilization, buying power, margin call risk")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<MarginStatusResponse>> getMarginStatus(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(marginService.getMarginStatus(accountId)));
    }
}
