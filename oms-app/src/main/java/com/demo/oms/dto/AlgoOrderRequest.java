package com.demo.oms.dto;

import com.demo.oms.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AlgoOrderRequest {

    @NotBlank
    private String accountId;

    @NotBlank
    private String symbol;

    @NotNull
    private ExchangeType exchange;

    @NotNull
    private OrderSide side;

    @NotNull
    private AlgoType algoType;

    @NotNull
    @DecimalMin("1")
    private BigDecimal totalQuantity;

    // Maximum price limit (buy) or minimum price floor (sell)
    private BigDecimal priceLimit;

    // TWAP: slice interval in seconds (default 300 = 5 min)
    private Integer sliceIntervalSeconds = 300;

    // POV: percentage of market volume to participate (0.01–0.30)
    @DecimalMin("0.01") @DecimalMax("0.30")
    private BigDecimal participationRate;

    // Execution window
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
