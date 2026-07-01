package com.demo.oms.controller;

import com.demo.oms.domain.Account;
import com.demo.oms.domain.RiskLimit;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.dto.RiskLimitsResponse;
import com.demo.oms.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Tag(name = "Accounts", description = "Beneficiary Owner (BO) account management")
@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    @Autowired private AccountService accountService;

    @Operation(summary = "Create a new BO account")
    @PostMapping
    public ResponseEntity<ApiResponse<Account>> createAccount(@RequestBody Account account) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Account created", accountService.createAccount(account)));
    }

    @Operation(summary = "Get account by BO number")
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<Account>> getAccount(@PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getAccount(accountId)));
    }

    @Operation(summary = "List all active accounts")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Account>>> getAllAccounts() {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getAllAccounts()));
    }

    @Operation(summary = "Deposit funds into a BO account (BDT)")
    @PostMapping("/{accountId}/deposit")
    public ResponseEntity<ApiResponse<Account>> deposit(
            @PathVariable String accountId,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok("Deposit successful", accountService.deposit(accountId, amount)));
    }

    @Operation(summary = "Withdraw funds from a BO account (BDT)")
    @PostMapping("/{accountId}/withdraw")
    public ResponseEntity<ApiResponse<Account>> withdraw(
            @PathVariable String accountId,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok("Withdrawal successful", accountService.withdraw(accountId, amount)));
    }

    @Operation(summary = "Get risk limits for an account")
    @GetMapping("/{accountId}/risk-limits")
    public ResponseEntity<ApiResponse<RiskLimitsResponse>> getRiskLimits(@PathVariable String accountId) {
        RiskLimit rl = accountService.getRiskLimits(accountId);
        return ResponseEntity.ok(ApiResponse.ok(RiskLimitsResponse.from(accountId, rl)));
    }

    @Operation(summary = "Update risk limits for an account")
    @PutMapping("/{accountId}/risk-limits")
    public ResponseEntity<ApiResponse<RiskLimitsResponse>> updateRiskLimits(
            @PathVariable String accountId,
            @RequestBody RiskLimit limits) {
        RiskLimit updated = accountService.updateRiskLimits(accountId, limits);
        return ResponseEntity.ok(ApiResponse.ok("Risk limits updated", RiskLimitsResponse.from(accountId, updated)));
    }
}
