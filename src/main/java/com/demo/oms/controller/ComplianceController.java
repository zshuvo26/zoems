package com.demo.oms.controller;

import com.demo.oms.domain.ComplianceRule;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.service.ComplianceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Compliance", description = "Pre-trade compliance rules run on every order: wash trade, duplicate order, restricted security, position limits")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/compliance")
@RequiredArgsConstructor
public class ComplianceController {

    private final ComplianceService complianceService;

    @Operation(
        summary = "List all active compliance rules",
        description = "Seeded rules: WASH_TRADE_WINDOW (30 min) and DUPLICATE_ORDER_WINDOW (30 sec). "
            + "Rules types: RESTRICTED_SECURITY, BLACKLISTED_ACCOUNT, MAX_POSITION_LIMIT, "
            + "MIN_HOLDING_PERIOD, SECTOR_CONCENTRATION, WASH_TRADE_WINDOW, "
            + "DUPLICATE_ORDER_WINDOW, INSIDER_RESTRICTION, MAX_DAILY_ORDER_VALUE. "
            + "Roles: ADMIN, DEALER"
    )
    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<ComplianceRule>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(complianceService.getAllRules()));
    }

    @Operation(
        summary = "Add a new compliance rule (takes effect immediately)",
        description = "Roles: ADMIN only"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Rule created and immediately active")
    @PostMapping("/rules")
    public ResponseEntity<ApiResponse<ComplianceRule>> addRule(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                content = @Content(examples = {
                    @ExampleObject(name = "Restrict Security",
                        value = "{\"ruleType\":\"RESTRICTED_SECURITY\",\"scope\":\"SYMBOL:BEXIMCO\","
                              + "\"ruleValue\":\"true\",\"description\":\"BEXIMCO restricted per BSEC directive\","
                              + "\"effectiveFrom\":\"2026-06-01\"}"),
                    @ExampleObject(name = "Max Position Limit",
                        value = "{\"ruleType\":\"MAX_POSITION_LIMIT\",\"scope\":\"GLOBAL\","
                              + "\"ruleValue\":\"50000\",\"description\":\"Max 50,000 shares in any single stock\","
                              + "\"effectiveFrom\":\"2026-06-24\"}"),
                    @ExampleObject(name = "Insider Restriction",
                        value = "{\"ruleType\":\"INSIDER_RESTRICTION\",\"scope\":\"ACCOUNT:1201880012345678\","
                              + "\"ruleValue\":\"GP\",\"description\":\"Board member restricted from trading GP\","
                              + "\"effectiveFrom\":\"2026-06-24\",\"effectiveTo\":\"2026-09-30\"}")
                })
            )
            @RequestBody ComplianceRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Compliance rule created", complianceService.addRule(rule)));
    }

    @Operation(
        summary = "Deactivate a compliance rule",
        description = "Soft-deactivates (sets active=false). Rule stays in DB for audit."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Rule deactivated")
    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @Parameter(description = "Compliance rule UUID") @PathVariable UUID ruleId) {
        complianceService.deactivateRule(ruleId);
        return ResponseEntity.ok(ApiResponse.ok("Rule deactivated", null));
    }
}
