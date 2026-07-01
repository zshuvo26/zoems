package com.demo.oms.dto;

import com.demo.oms.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class OrderRequest {

    @NotBlank(message = "Account ID is required")
    private String accountId;

    private String boid;                    // Beneficial Owner ID
    private String dealerId;               // Entering dealer

    @NotBlank(message = "Symbol is required")
    private String symbol;

    private String isin;                   // ISIN (optional — resolved from instrument master)

    @NotNull(message = "Exchange is required")
    private ExchangeType exchange;

    @NotNull(message = "Side is required")
    private OrderSide side;

    @NotNull(message = "Order type is required")
    private OrderType orderType;

    private TimeInForce timeInForce = TimeInForce.DAY;

    private AssetClass assetClass = AssetClass.EQUITY;

    private SettlementType settlementType = SettlementType.T2;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "1", message = "Quantity must be at least 1")
    private BigDecimal quantity;

    @DecimalMin(value = "0.01", message = "Price must be positive")
    private BigDecimal price;

    @DecimalMin(value = "0.01", message = "Stop price must be positive")
    private BigDecimal stopPrice;

    private BigDecimal displayQuantity;    // Iceberg: visible quantity

    private LocalDate expireDate;          // GTD orders

    private String source = "API";

    @Size(max = 500, message = "Text must not exceed 500 characters")
    private String text;

    @Size(max = 500, message = "Remarks must not exceed 500 characters")
    private String remarks;

    @Size(max = 1000, message = "Dealer notes must not exceed 1000 characters")
    private String dealerNotes;
}
