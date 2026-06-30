package com.demo.oms.controller;

import com.demo.oms.domain.*;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.repository.IpoListingRepository;
import com.demo.oms.service.IpoService;
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

@Tag(name = "IPO Management", description = "Bangladesh primary market — subscription, lottery allotment, refund processing")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/ipo")
@RequiredArgsConstructor
public class IpoController {

    private final IpoService ipoService;
    private final IpoListingRepository ipoListingRepository;

    @Operation(
        summary = "List open IPOs available for subscription",
        description = "Returns IPOs with status=OPEN and subscriptionClose >= today. "
            + "Seeded: NEWCO-PHARMA-2026-IPO (OPEN, BDT 30/share), TECHBD-2026-IPO (CLOSED)."
    )
    @GetMapping("/open")
    public ResponseEntity<ApiResponse<List<IpoListing>>> getOpenIpos() {
        return ResponseEntity.ok(ApiResponse.ok(ipoService.getOpenIpos()));
    }

    @Operation(summary = "List all IPOs (OPEN, CLOSED, ALLOTTED, LISTED)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<IpoListing>>> getAllIpos() {
        return ResponseEntity.ok(ApiResponse.ok(ipoService.getAllIpos()));
    }

    @Operation(summary = "Get IPO details by ID")
    @GetMapping("/{ipoId}")
    public ResponseEntity<ApiResponse<IpoListing>> getIpo(
            @Parameter(description = "IPO ID", example = "NEWCO-PHARMA-2026-IPO")
            @PathVariable String ipoId) {
        return ResponseEntity.ok(ApiResponse.ok(ipoService.getIpo(ipoId)));
    }

    @Operation(
        summary = "Apply for an IPO",
        description = "Submit a subscription application. Amount deducted immediately from account cash. "
            + "Refund credited after allotment for unallotted lots. "
            + "Min: 1 lot, Max: 20 lots. One application per account per IPO. "
            + "Roles: ADMIN, DEALER, TRADER"
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Application submitted — amount reserved"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "IPO not open or duplicate application"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Insufficient funds or lot limit exceeded")
    })
    @PostMapping("/{ipoId}/apply")
    public ResponseEntity<ApiResponse<IpoApplication>> apply(
            @Parameter(description = "IPO ID", example = "NEWCO-PHARMA-2026-IPO") @PathVariable String ipoId,
            @Parameter(description = "BO Account number", example = "1201880012345678") @RequestParam String accountId,
            @Parameter(description = "Number of lots (1-20)", example = "5") @RequestParam int lots) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("IPO application submitted", ipoService.applyForIpo(ipoId, accountId, lots)));
    }

    @Operation(summary = "Get IPO applications for an account")
    @GetMapping("/applications/{accountId}")
    public ResponseEntity<ApiResponse<List<IpoApplication>>> getApplications(
            @Parameter(description = "BO Account number", example = "1201880012345678")
            @PathVariable String accountId) {
        return ResponseEntity.ok(ApiResponse.ok(ipoService.getApplicationsByAccount(accountId)));
    }

    @Operation(
        summary = "Process allotment for a closed IPO (ADMIN only)",
        description = "Runs lottery/pro-rata allotment. Sets allottedLots, calculates refunds, "
            + "creates new positions for allotted shares, and sends notifications. "
            + "Roles: ADMIN only"
    )
    @PostMapping("/{ipoId}/allot")
    public ResponseEntity<ApiResponse<Void>> processAllotment(
            @Parameter(description = "IPO ID", example = "TECHBD-2026-IPO")
            @PathVariable String ipoId) {
        ipoService.processAllotment(ipoId);
        return ResponseEntity.ok(ApiResponse.ok("Allotment processed for " + ipoId, null));
    }

    @Operation(
        summary = "Create a new IPO listing (ADMIN only)",
        description = "Roles: ADMIN only"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "IPO listing created")
    @PostMapping
    public ResponseEntity<ApiResponse<IpoListing>> createIpo(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                content = @Content(examples = {
                    @ExampleObject(name = "New IPO",
                        value = "{\"ipoId\":\"ACME-TECH-2026-IPO\",\"symbol\":\"ACMETECH\","
                              + "\"companyName\":\"ACME Technology Ltd\",\"sector\":\"IT\","
                              + "\"issuePrice\":75.00,\"faceValue\":10.00,\"lotSize\":100,"
                              + "\"minLots\":1,\"maxLots\":15,\"totalSharesOnOffer\":5000000,"
                              + "\"subscriptionOpen\":\"2026-07-01\",\"subscriptionClose\":\"2026-07-07\","
                              + "\"allotmentDate\":\"2026-07-21\",\"listingDate\":\"2026-07-28\","
                              + "\"status\":\"OPEN\"}")
                })
            )
            @RequestBody IpoListing ipo) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("IPO listing created", ipoListingRepository.save(ipo)));
    }
}
