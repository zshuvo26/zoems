package com.demo.oms.controller;

import com.demo.oms.domain.Watchlist;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.WatchlistItemResponse;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.WatchlistRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Watchlist", description = "Manage account watchlists")
@RestController
@RequestMapping("/api/v1/watchlists")
public class WatchlistController {

    @Autowired private WatchlistRepository watchlistRepository;
    @Autowired private InstrumentRepository instrumentRepository;

    @Operation(summary = "Add a symbol to watchlist")
    @PostMapping("/{accountId}")
    public ResponseEntity<ApiResponse<Watchlist>> addToWatchlist(
            @PathVariable String accountId,
            @RequestBody Watchlist entry) {
        entry.setAccountId(accountId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Added to watchlist", watchlistRepository.save(entry)));
    }

    @Operation(summary = "Get watchlist with live quotes")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<List<WatchlistItemResponse>>> getWatchlist(
            @PathVariable String accountId) {
        List<Watchlist> entries = watchlistRepository.findByAccountId(accountId);
        List<WatchlistItemResponse> items = entries.stream()
                .map(w -> WatchlistItemResponse.from(
                        w,
                        instrumentRepository.findById(w.getSymbol()).orElse(null)
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @Operation(summary = "Remove a symbol from watchlist")
    @DeleteMapping("/{accountId}/{symbol}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> removeFromWatchlist(
            @PathVariable String accountId,
            @PathVariable String symbol) {
        watchlistRepository.deleteByAccountIdAndSymbol(accountId, symbol.toUpperCase());
        return ResponseEntity.ok(ApiResponse.ok("Removed from watchlist", null));
    }
}
