package com.demo.oms.controller;

import com.demo.oms.domain.LedgerEntry;
import com.demo.oms.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService service;

    @GetMapping("/{accountId}")
    public Page<LedgerEntry> history(@PathVariable String accountId,
                                     @RequestParam(defaultValue = "0")  int page,
                                     @RequestParam(defaultValue = "50") int size) {
        return service.getHistory(accountId, page, size);
    }

    @GetMapping("/{accountId}/commission")
    public Map<String, BigDecimal> totalCommission(@PathVariable String accountId) {
        return Map.of("totalCommission", service.totalCommission(accountId));
    }
}
