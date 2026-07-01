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

@Tag(name = "Watchlist", description = "Manage named account watchlists")
@RestController
@RequestMapping("/api/v1/watchlists")
public class WatchlistController {

    @Autowired private WatchlistRepository watchlistRepository;
    @Autowired private InstrumentRepository instrumentRepository;

    @Operation(summary = "Add a symbol to a named watchlist")
    @PostMapping("/{accountId}")
    public ResponseEntity<ApiResponse<Watchlist>> addToWatchlist(
            @PathVariable String accountId,
            @RequestBody Watchlist entry) {
        entry.setAccountId(accountId);
        if (entry.getName() == null || entry.getName().isBlank()) {
            entry.setName("Default");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Added to watchlist", watchlistRepository.save(entry)));
    }

    @Operation(summary = "Get watchlist with live quotes, optionally filtered by list name")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<List<WatchlistItemResponse>>> getWatchlist(
            @PathVariable String accountId,
            @RequestParam(required = false) String listName) {
        List<Watchlist> entries = listName != null
                ? watchlistRepository.findByAccountIdAndName(accountId, listName)
                : watchlistRepository.findByAccountId(accountId);
        List<WatchlistItemResponse> items = entries.stream()
                .map(w -> WatchlistItemResponse.from(
                        w,
                        instrumentRepository.findById(w.getSymbol()).orElse(null)
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @Operation(summary = "Get all watchlist names for an account")
    @GetMapping("/{accountId}/lists")
    public ResponseEntity<ApiResponse<List<String>>> getWatchlistNames(
            @PathVariable String accountId) {
        List<String> names = watchlistRepository.findByAccountId(accountId).stream()
                .map(w -> w.getName() != null ? w.getName() : "Default")
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (names.isEmpty()) names.add("Default");
        return ResponseEntity.ok(ApiResponse.ok(names));
    }

    @Operation(summary = "Remove a symbol from watchlist (optionally scoped to a list)")
    @DeleteMapping("/{accountId}/{symbol}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> removeFromWatchlist(
            @PathVariable String accountId,
            @PathVariable String symbol,
            @RequestParam(required = false) String listName) {
        if (listName != null) {
            watchlistRepository.deleteByAccountIdAndSymbolAndName(accountId, symbol.toUpperCase(), listName);
        } else {
            watchlistRepository.deleteByAccountIdAndSymbol(accountId, symbol.toUpperCase());
        }
        return ResponseEntity.ok(ApiResponse.ok("Removed from watchlist", null));
    }
}
