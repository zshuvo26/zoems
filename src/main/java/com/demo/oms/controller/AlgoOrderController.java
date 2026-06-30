package com.demo.oms.controller;

import com.demo.oms.domain.AlgoOrder;
import com.demo.oms.dto.*;
import com.demo.oms.service.AlgoOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Algorithmic Orders", description = "TWAP, VWAP, POV, IS — automated order slicing and execution strategies")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/algo")
@RequiredArgsConstructor
public class AlgoOrderController {

    private final AlgoOrderService algoService;

    @Operation(
        summary = "Create an algorithmic order",
        description = "Create and immediately start an algo order. The MarketScheduler automatically slices "
            + "every sliceIntervalSeconds. Strategies: TWAP (equal slices), VWAP (front-loaded), "
            + "POV (% of market volume), IS (implementation shortfall). Roles: ADMIN, DEALER"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Algo order created and started — status=RUNNING"),
        @ApiResponse(responseCode = "400", description = "Invalid parameters"),
        @ApiResponse(responseCode = "403", description = "Insufficient role")
    })
    @PostMapping
    public ResponseEntity<com.demo.oms.dto.ApiResponse<AlgoOrder>> createAlgo(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                content = @Content(examples = {
                    @ExampleObject(name = "TWAP — 500 GP over session",
                        value = "{\"accountId\":\"1201880087654321\",\"symbol\":\"GP\",\"exchange\":\"DSE\","
                              + "\"side\":\"BUY\",\"algoType\":\"TWAP\",\"totalQuantity\":500,"
                              + "\"priceLimit\":315.00,\"sliceIntervalSeconds\":1440}"),
                    @ExampleObject(name = "VWAP — front-loaded sell",
                        value = "{\"accountId\":\"1201880087654321\",\"symbol\":\"WALTONHIL\",\"exchange\":\"DSE\","
                              + "\"side\":\"SELL\",\"algoType\":\"VWAP\",\"totalQuantity\":20,"
                              + "\"sliceIntervalSeconds\":900}"),
                    @ExampleObject(name = "POV — 15% participation",
                        value = "{\"accountId\":\"1201880087654321\",\"symbol\":\"RENATA\",\"exchange\":\"DSE\","
                              + "\"side\":\"BUY\",\"algoType\":\"POV\",\"totalQuantity\":30,"
                              + "\"priceLimit\":1100.00,\"participationRate\":0.15,\"sliceIntervalSeconds\":600}")
                })
            )
            @Valid @RequestBody AlgoOrderRequest req) {
        AlgoOrder algo = algoService.createAlgoOrder(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(com.demo.oms.dto.ApiResponse.ok("Algo order created and running", algo));
    }

    @Operation(
        summary = "Get all algo orders for an account",
        description = "Returns RUNNING, PAUSED, COMPLETED and CANCELLED algo orders for the account."
    )
    @GetMapping("/account/{accountId}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<List<AlgoOrder>>> getByAccount(
            @Parameter(description = "BO Account number", example = "1201880087654321")
            @PathVariable String accountId) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(algoService.getByAccount(accountId)));
    }

    @Operation(
        summary = "Get algo order by ID",
        description = "Returns slice progress: completedSlices/totalSlices, avgExecutedPrice, remainingQuantity."
    )
    @GetMapping("/{algoId}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<AlgoOrder>> getById(
            @Parameter(description = "Algo order UUID") @PathVariable UUID algoId) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(algoService.findById(algoId)));
    }

    @Operation(
        summary = "Pause a running algo order",
        description = "Suspends slice execution. Use during volatile price periods. Resume when conditions normalize."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Algo paused — status=PAUSED"),
        @ApiResponse(responseCode = "422", description = "Algo is not in RUNNING state")
    })
    @PostMapping("/{algoId}/pause")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<AlgoOrder>> pause(
            @Parameter(description = "Algo order UUID") @PathVariable UUID algoId) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok("Algo paused", algoService.pause(algoId)));
    }

    @Operation(
        summary = "Resume a paused algo order",
        description = "Resumes slice execution from where it was paused."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Algo resumed — status=RUNNING"),
        @ApiResponse(responseCode = "422", description = "Algo is not in PAUSED state")
    })
    @PostMapping("/{algoId}/resume")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<AlgoOrder>> resume(
            @Parameter(description = "Algo order UUID") @PathVariable UUID algoId) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok("Algo resumed", algoService.resume(algoId)));
    }

    @Operation(
        summary = "Cancel an active algo order",
        description = "Stops all future slices. Already-submitted child orders are not auto-cancelled."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Algo cancelled — status=CANCELLED"),
        @ApiResponse(responseCode = "422", description = "Algo already completed or cancelled")
    })
    @DeleteMapping("/{algoId}")
    public ResponseEntity<com.demo.oms.dto.ApiResponse<AlgoOrder>> cancel(
            @Parameter(description = "Algo order UUID") @PathVariable UUID algoId,
            @Parameter(description = "Cancellation reason")
            @RequestParam(defaultValue = "Client requested cancellation") String reason) {
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok("Algo cancelled",
                algoService.cancel(algoId, reason)));
    }
}
