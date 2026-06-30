package com.demo.oms.dto;

import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderType;
import com.demo.oms.enums.TimeInForce;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class OrderRequest {

    @NotBlank(message = "Account ID is required")
    private String accountId;

    @NotBlank(message = "Symbol is required")
    private String symbol;

    @NotNull(message = "Exchange is required")
    private ExchangeType exchange;

    @NotNull(message = "Side is required")
    private OrderSide side;

    @NotNull(message = "Order type is required")
    private OrderType orderType;

    private TimeInForce timeInForce = TimeInForce.DAY;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "1", message = "Quantity must be at least 1")
    private BigDecimal quantity;

    // Required for LIMIT, STOP_LIMIT orders
    @DecimalMin(value = "0.01", message = "Price must be positive")
    private BigDecimal price;

    // Required for STOP, STOP_LIMIT orders
    @DecimalMin(value = "0.01", message = "Stop price must be positive")
    private BigDecimal stopPrice;

    // Iceberg: visible quantity (must be < quantity)
    private BigDecimal displayQuantity;

    // For GTD orders
    private LocalDate expireDate;

    private String source = "API";

    @Size(max = 500, message = "Text must not exceed 500 characters")
    private String text;
}
