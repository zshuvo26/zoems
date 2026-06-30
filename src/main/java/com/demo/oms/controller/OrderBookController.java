package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.OrderBookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Order Book (L2)", description = "Level 2 market depth — 5-level bid/ask with quantity, order count and spread")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/orderbook")
@RequiredArgsConstructor
public class OrderBookController {

    private final OrderBookService orderBookService;

    @Operation(
        summary = "Get Level 2 order book for a symbol",
        description = """
            Returns simulated 5-level bid/ask depth for a listed security.

            **Data refreshes** every 5 seconds via the market data tick scheduler.

            **Response includes:**
            - 5 bid levels (buy side) with price, quantity, and order count
            - 5 ask levels (sell side) with price, quantity, and order count
            - Best bid/ask spread in BDT and basis points
            - Last trade price, previous close, change%, circuit limits

            **Circuit breaker check:** If the instrument is halted or under circuit breaker,
            the order book reflects constrained price levels within ±10% of previous close.

            **Seeded symbols (DSE):** GP, SQURPHARMA, BRACBANK, RENATA, WALTONHIL, BERGERPBL,
            DUTCHBANGLA, ISLAMIBANK, LHBL, HEIDELBCEM, MARICO, BATBC, BEXIMCO, SINGER, etc.
            """
    )
    @GetMapping("/{symbol}")
    public ResponseEntity<ApiResponse<OrderBookResponse>> getOrderBook(
            @Parameter(description = "Trading symbol (DSE)", example = "GP")
            @PathVariable String symbol,
            @Parameter(description = "Exchange (DSE or CSE)", example = "DSE")
            @RequestParam(defaultValue = "DSE") String exchange) {
        return ResponseEntity.ok(ApiResponse.ok(orderBookService.getOrderBook(symbol)));
    }
}
