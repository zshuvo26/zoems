package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.service.MarketBreadthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Market Breadth", description = "DSEX/CSCX market internals — top gainers, losers, most active, advance-decline ratio")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/market/breadth")
@RequiredArgsConstructor
public class MarketBreadthController {

    private final MarketBreadthService breadthService;

    @Operation(
        summary = "Market breadth snapshot for DSE or CSE",
        description = """
            Returns a complete market summary for the selected exchange.

            **Response includes:**
            - Advance/Decline/Unchanged counts and ratio
            - Total market volume and traded value
            - Composite index level (price-weighted average) and change%
            - Top 10 gainers by % change
            - Top 10 losers by % change
            - Top 10 most active by volume
            - Timestamp in Asia/Dhaka timezone (BST = UTC+6)

            **Use cases:**
            - Pre-trading market assessment
            - Index-level risk monitoring
            - Sector rotation signals
            - Real-time dashboard feeds

            **Available exchanges:** DSE (40 stocks seeded), CSE (5 stocks seeded)
            """
    )
    @GetMapping("/{exchange}")
    public ResponseEntity<ApiResponse<MarketBreadthResponse>> getBreadth(
            @Parameter(description = "Exchange: DSE or CSE", example = "DSE")
            @PathVariable ExchangeType exchange) {
        return ResponseEntity.ok(ApiResponse.ok(breadthService.getBreadth(exchange)));
    }
}
