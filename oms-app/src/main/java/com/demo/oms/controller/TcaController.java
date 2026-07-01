package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.TcaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Transaction Cost Analysis", description = "TCA — slippage, implementation shortfall, market impact per order")
@RestController
@RequestMapping("/api/v1/tca")
@RequiredArgsConstructor
public class TcaController {

    private final TcaService tcaService;

    @Operation(summary = "TCA for a single order — slippage, IS, fill breakdown")
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<TcaResponse>> getOrderTca(@PathVariable UUID orderId) {
        return ResponseEntity.ok(ApiResponse.ok(tcaService.analyzeOrder(orderId)));
    }

    @Operation(summary = "TCA summary for all filled orders in an account")
    @GetMapping("/account/{accountId}")
    public ResponseEntity<ApiResponse<List<TcaResponse>>> getAccountTca(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(tcaService.analyzeAccount(accountId)));
    }
}
