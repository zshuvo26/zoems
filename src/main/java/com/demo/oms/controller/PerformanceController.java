package com.demo.oms.controller;

import com.demo.oms.dto.*;
import com.demo.oms.service.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Performance Attribution", description = "Portfolio return vs DSEX benchmark — alpha, sector allocation, top/bottom contributors")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/performance")
@RequiredArgsConstructor
public class PerformanceController {

    private final PerformanceService performanceService;

    @Operation(
        summary = "Portfolio performance attribution",
        description = """
            Calculates portfolio return against the DSEX benchmark for the selected period.

            **Response includes:**
            - Portfolio return % (based on P&L vs cost basis)
            - DSEX benchmark return % (static reference rates)
            - Alpha = Portfolio return − Benchmark return
            - Sector allocation breakdown (% of portfolio by sector)
            - Top 5 winners and bottom 5 losers by contribution

            **Benchmark reference rates (DSEX):**
            | Period | Benchmark Return |
            |--------|----------------|
            | 1D | +0.12% |
            | 1W | +0.45% |
            | 1M | +1.20% |
            | 3M | +3.50% |
            | YTD | +8.20% |
            | 1Y | +12.50% |

            **Periods:** 1D, 1W, 1M (default: YTD)

            **Use this endpoint to answer:** "Am I outperforming or underperforming the DSEX index?"
            """
    )
    @GetMapping("/{accountId}")
    public ResponseEntity<ApiResponse<PerformanceResponse>> getPerformance(
            @Parameter(description = "BO Account number", example = "1201880087654321")
            @PathVariable String accountId,
            @Parameter(description = "Measurement period: 1D, 1W, 1M, 3M, YTD, 1Y", example = "1M")
            @RequestParam(defaultValue = "YTD") String period) {
        return ResponseEntity.ok(ApiResponse.ok(performanceService.getPerformance(accountId, period)));
    }
}
