package com.demo.oms.controller;

import com.demo.oms.domain.Instrument;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.OhlcvBar;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.service.InstrumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Instruments", description = "Securities master data — DSE/CSE listed stocks")
@RestController
@RequestMapping("/api/v1/instruments")
public class InstrumentController {

    @Autowired private InstrumentService instrumentService;

    @Operation(summary = "Get instrument details")
    @GetMapping("/{symbol}")
    public ResponseEntity<ApiResponse<Instrument>> getInstrument(@PathVariable String symbol) {
        return ResponseEntity.ok(ApiResponse.ok(instrumentService.getInstrument(symbol)));
    }

    @Operation(summary = "List instruments with optional filtering and pagination")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<Instrument>>> listInstruments(
            @RequestParam(required = false) ExchangeType exchange,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sector,
            @RequestParam(required = false) String board,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "symbol") String sort) {
        Page<Instrument> result = instrumentService.getFiltered(
                exchange, search, sector,
                PageRequest.of(page, size, Sort.by(sort)));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @Operation(summary = "Price history (OHLCV bars) for an instrument")
    @GetMapping("/{symbol}/history")
    public ResponseEntity<ApiResponse<List<OhlcvBar>>> getPriceHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(instrumentService.getPriceHistory(symbol, days)));
    }

    @Operation(summary = "Search instruments by symbol or name")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Instrument>>> search(@RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.ok(instrumentService.search(q)));
    }

    @Operation(summary = "Get list of distinct sectors")
    @GetMapping("/sectors")
    public ResponseEntity<ApiResponse<List<String>>> getSectors(
            @RequestParam(defaultValue = "DSE") ExchangeType exchange) {
        return ResponseEntity.ok(ApiResponse.ok(instrumentService.getSectors(exchange)));
    }

    @Operation(summary = "Get halted instruments")
    @GetMapping("/halted")
    public ResponseEntity<ApiResponse<List<Instrument>>> getHalted() {
        return ResponseEntity.ok(ApiResponse.ok(instrumentService.getHalted()));
    }

    @Operation(summary = "Halt an instrument (admin)")
    @PostMapping("/{symbol}/halt")
    public ResponseEntity<ApiResponse<Void>> halt(
            @PathVariable String symbol,
            @RequestParam String reason) {
        instrumentService.haltInstrument(symbol, reason);
        return ResponseEntity.ok(ApiResponse.ok("Instrument halted", null));
    }

    @Operation(summary = "Resume a halted instrument (admin)")
    @PostMapping("/{symbol}/resume")
    public ResponseEntity<ApiResponse<Void>> resume(@PathVariable String symbol) {
        instrumentService.resumeInstrument(symbol);
        return ResponseEntity.ok(ApiResponse.ok("Instrument resumed", null));
    }
}
