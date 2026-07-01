package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.MarketDataResponse;
import com.demo.oms.dto.MarketStatusResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.service.MarketDataService;
import com.demo.oms.service.MarketHoursService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Market Data", description = "Real-time and reference market data for DSE/CSE")
@RestController
@RequestMapping("/api/v1/market")
public class MarketDataController {

    @Autowired private MarketDataService marketDataService;
    @Autowired private MarketHoursService marketHoursService;

    @Operation(summary = "Get current market status (open/close, session, next open)")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<MarketStatusResponse>> getMarketStatus() {
        return ResponseEntity.ok(ApiResponse.ok(marketHoursService.getMarketStatus()));
    }

    @Operation(summary = "Get live quote for a symbol")
    @GetMapping("/quote/{symbol}")
    public ResponseEntity<ApiResponse<MarketDataResponse>> getQuote(@PathVariable String symbol) {
        return ResponseEntity.ok(ApiResponse.ok(marketDataService.getQuote(symbol.toUpperCase())));
    }

    @Operation(summary = "Get all quotes for an exchange (DSE or CSE)")
    @GetMapping("/quotes/{exchange}")
    public ResponseEntity<ApiResponse<List<MarketDataResponse>>> getExchangeQuotes(
            @PathVariable ExchangeType exchange) {
        return ResponseEntity.ok(ApiResponse.ok(marketDataService.getQuotes(exchange)));
    }

    @Operation(summary = "Search instruments by symbol or company name")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<MarketDataResponse>>> searchInstruments(
            @RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.ok(marketDataService.search(q)));
    }
}
