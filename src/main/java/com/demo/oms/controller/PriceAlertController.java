package com.demo.oms.controller;

import com.demo.oms.domain.PriceAlert;
import com.demo.oms.service.PriceAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class PriceAlertController {

    private final PriceAlertService service;

    @GetMapping("/{accountId}")
    public List<PriceAlert> list(@PathVariable String accountId) {
        return service.getByAccount(accountId);
    }

    @PostMapping
    public PriceAlert create(@RequestBody PriceAlert alert) {
        return service.create(alert);
    }

    @DeleteMapping("/{alertId}")
    public ResponseEntity<Void> delete(@PathVariable String alertId,
                                       @RequestParam String accountId) {
        service.delete(alertId, accountId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{alertId}/toggle")
    public PriceAlert toggle(@PathVariable String alertId,
                             @RequestParam String accountId) {
        return service.toggleActive(alertId, accountId);
    }
}
