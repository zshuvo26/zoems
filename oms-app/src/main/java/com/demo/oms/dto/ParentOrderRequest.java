package com.demo.oms.dto;

import com.demo.oms.enums.AssetClass;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ParentOrderRequest {

    @NotBlank(message = "Account ID is required")
    private String accountId;

    private String boid;
    private String dealerId;

    @NotBlank(message = "Symbol is required")
    private String symbol;

    private String isin;

    @NotNull(message = "Exchange is required")
    private ExchangeType exchange;

    @NotNull(message = "Side is required")
    private OrderSide side;

    private AssetClass assetClass = AssetClass.EQUITY;

    @NotNull(message = "Total quantity is required")
    @DecimalMin(value = "1", message = "Total quantity must be at least 1")
    private BigDecimal totalQuantity;

    @DecimalMin(value = "0.01", message = "Price limit must be positive")
    private BigDecimal priceLimit;  // null = market

    @Min(value = 2, message = "Must split into at least 2 slices")
    @Max(value = 1000, message = "Cannot exceed 1000 slices")
    private int numSlices = 10;

    private String notes;
}
