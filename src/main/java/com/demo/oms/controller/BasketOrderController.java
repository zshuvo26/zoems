package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.BasketOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Basket Trading", description = "Submit multiple orders in one API call — program/basket trading")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/basket")
@RequiredArgsConstructor
public class BasketOrderController {

    private final BasketOrderService basketService;

    @Operation(
        summary = "Submit a basket of orders",
        description = "Submit multiple orders in a single call. Each order passes compliance and risk checks independently. "
            + "allOrNone=true logs a warning if any order fails but does NOT auto-cancel accepted ones. "
            + "Roles: ADMIN, DEALER"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Basket processed — per-order results in response body"),
        @ApiResponse(responseCode = "400", description = "Invalid basket structure"),
        @ApiResponse(responseCode = "401", description = "Authentication required"),
        @ApiResponse(responseCode = "403", description = "Insufficient role")
    })
    @PostMapping
    public ResponseEntity<com.demo.oms.dto.ApiResponse<BasketOrderResult>> submitBasket(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Basket order request",
                content = @Content(examples = {
                    @ExampleObject(name = "Portfolio Rebalance",
                        value = "{\"basketName\":\"Q2 Rebalance\",\"accountId\":\"1201880087654321\","
                              + "\"allOrNone\":false,\"orders\":["
                              + "{\"symbol\":\"SQURPHARMA\",\"exchange\":\"DSE\",\"side\":\"BUY\","
                              + "\"orderType\":\"LIMIT\",\"quantity\":50,\"price\":238.00},"
                              + "{\"symbol\":\"RENATA\",\"exchange\":\"DSE\",\"side\":\"BUY\","
                              + "\"orderType\":\"LIMIT\",\"quantity\":10,\"price\":1090.00},"
                              + "{\"symbol\":\"BRACBANK\",\"exchange\":\"DSE\",\"side\":\"BUY\","
                              + "\"orderType\":\"LIMIT\",\"quantity\":200,\"price\":44.00}]}"),
                    @ExampleObject(name = "Single Symbol Basket",
                        value = "{\"basketName\":\"GP Accumulate\",\"accountId\":\"1201880012345678\","
                              + "\"allOrNone\":false,\"orders\":["
                              + "{\"symbol\":\"GP\",\"exchange\":\"DSE\",\"side\":\"BUY\","
                              + "\"orderType\":\"LIMIT\",\"quantity\":5,\"price\":305.00}]}")
                })
            )
            @RequestBody BasketOrderRequest req) {
        BasketOrderResult result = basketService.submitBasket(req);
        String msg = String.format("Basket submitted: %d accepted, %d rejected",
                result.getAccepted(), result.getRejected());
        return ResponseEntity.ok(com.demo.oms.dto.ApiResponse.ok(msg, result));
    }
}
