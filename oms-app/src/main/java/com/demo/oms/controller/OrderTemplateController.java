package com.demo.oms.controller;

import com.demo.oms.domain.OrderTemplate;
import com.demo.oms.service.OrderTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class OrderTemplateController {

    private final OrderTemplateService service;

    @GetMapping("/{accountId}")
    public List<OrderTemplate> list(@PathVariable String accountId) {
        return service.getByAccount(accountId);
    }

    @PostMapping
    public OrderTemplate save(@RequestBody OrderTemplate template) {
        return service.save(template);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestParam String accountId) {
        service.delete(id, accountId);
        return ResponseEntity.noContent().build();
    }
}
