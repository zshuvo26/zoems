package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.PortfolioResponse;
import com.demo.oms.dto.PositionResponse;
import com.demo.oms.service.PositionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Portfolio", description = "Portfolio positions and P&L")
@RestController
@RequestMapping("/api/v1/portfolio")
public class PortfolioController {

    @Autowired private PositionService positionService;

    @Operation(summary = "Get full portfolio with all positions and P&L summary")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<PortfolioResponse>> getPortfolio(
            @PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(positionService.getPortfolio(accountId)));
    }

    @Operation(summary = "Get individual positions for an account")
    @GetMapping("/{accountId}/positions")
    public ResponseEntity<ApiResponse<List<PositionResponse>>> getPositions(
            @PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(positionService.getPositions(accountId)));
    }

    @Operation(summary = "Trigger mark-to-market revaluation for an account")
    @PostMapping("/{accountId}/mark-to-market")
    public ResponseEntity<ApiResponse<Void>> markToMarket(@PathVariable String accountId) {
        positionService.markToMarket(accountId);
        return ResponseEntity.ok(ApiResponse.ok("Mark-to-market completed", null));
    }
}
