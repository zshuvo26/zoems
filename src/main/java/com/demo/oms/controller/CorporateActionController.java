package com.demo.oms.controller;

import com.demo.oms.domain.CorporateAction;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.service.CorporateActionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Corporate Actions", description = "BSEC-notified events: dividend, bonus share, stock split — auto-adjusts all holder positions")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/corporate-actions")
@RequiredArgsConstructor
public class CorporateActionController {

    private final CorporateActionService caService;

    @Operation(
        summary = "Announce a new corporate action",
        description = "Record a corporate action. NOT applied until POST /{caId}/process is called. "
            + "Types: CASH_DIVIDEND, BONUS_SHARE (ratio=0.30 → +30% shares), STOCK_SPLIT (ratio=2 → 2x shares), "
            + "REVERSE_SPLIT (ratio=2 → halved), RIGHTS_ISSUE. Roles: ADMIN"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Corporate action recorded")
    @PostMapping
    public ResponseEntity<ApiResponse<CorporateAction>> create(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                content = @Content(examples = {
                    @ExampleObject(name = "Cash Dividend",
                        value = "{\"symbol\":\"GP\",\"exchange\":\"DSE\",\"type\":\"CASH_DIVIDEND\","
                              + "\"announcementDate\":\"2026-06-01\",\"exDate\":\"2026-06-15\","
                              + "\"recordDate\":\"2026-06-20\",\"paymentDate\":\"2026-07-15\","
                              + "\"ratio\":15.00,\"description\":\"Annual dividend BDT 15/share FY2025\","
                              + "\"announcedBy\":\"Board of Directors\"}"),
                    @ExampleObject(name = "30% Bonus Share",
                        value = "{\"symbol\":\"SQURPHARMA\",\"exchange\":\"DSE\",\"type\":\"BONUS_SHARE\","
                              + "\"announcementDate\":\"2026-06-10\",\"exDate\":\"2026-06-25\","
                              + "\"ratio\":0.30,\"description\":\"30% bonus — 3 shares per 10 held\"}"),
                    @ExampleObject(name = "2-for-1 Stock Split",
                        value = "{\"symbol\":\"WALTONHIL\",\"exchange\":\"DSE\",\"type\":\"STOCK_SPLIT\","
                              + "\"announcementDate\":\"2026-06-15\",\"exDate\":\"2026-07-01\","
                              + "\"ratio\":2.0,\"description\":\"2-for-1 split, face value BDT 10 to BDT 5\"}")
                })
            )
            @RequestBody CorporateAction ca) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Corporate action created", caService.create(ca)));
    }

    @Operation(
        summary = "List all corporate actions",
        description = "Optional filter by symbol or exchange query params."
    )
    @GetMapping
    public ResponseEntity<ApiResponse<List<CorporateAction>>> getAll(
            @Parameter(description = "Filter by symbol (e.g., GP)") @RequestParam(required = false) String symbol,
            @Parameter(description = "Filter by exchange") @RequestParam(required = false) String exchange) {
        if (symbol != null) {
            return ResponseEntity.ok(ApiResponse.ok(caService.getBySymbol(symbol.toUpperCase())));
        }
        return ResponseEntity.ok(ApiResponse.ok(caService.getAll()));
    }

    @Operation(summary = "Get corporate actions for a specific symbol")
    @GetMapping("/symbol/{symbol}")
    public ResponseEntity<ApiResponse<List<CorporateAction>>> getBySymbol(
            @Parameter(description = "Trading symbol", example = "GP") @PathVariable String symbol) {
        return ResponseEntity.ok(ApiResponse.ok(caService.getBySymbol(symbol.toUpperCase())));
    }

    @Operation(
        summary = "Get upcoming corporate actions",
        description = "Returns actions with exDate within the next N days."
    )
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<CorporateAction>>> getUpcoming(
            @Parameter(description = "Look-ahead days", example = "30")
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(caService.getUpcoming(days)));
    }

    @Operation(
        summary = "Apply corporate action to all holder positions (ADMIN only)",
        description = "Irreversible — adjusts position quantities for all accounts holding the symbol. "
            + "Verify announcement details before calling this endpoint."
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Applied to all positions"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Already processed"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Not found")
    })
    @PostMapping("/{caId}/process")
    public ResponseEntity<ApiResponse<Void>> process(
            @Parameter(description = "Corporate action UUID") @PathVariable UUID caId) {
        caService.applyCorporateAction(caId);
        return ResponseEntity.ok(ApiResponse.ok("Corporate action applied to all positions", null));
    }
}
