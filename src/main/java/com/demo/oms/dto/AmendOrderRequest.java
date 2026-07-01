package com.demo.oms.dto;

import com.demo.oms.enums.TimeInForce;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AmendOrderRequest {

    @DecimalMin(value = "1", message = "New quantity must be at least 1")
    private BigDecimal newQuantity;

    @DecimalMin(value = "0.01", message = "New price must be positive")
    private BigDecimal newPrice;

    private BigDecimal newStopPrice;

    private TimeInForce newTimeInForce;   // Allows validity change (DAY→GTC etc.)

    private String reason;

    private String dealerNotes;           // Dealer annotation for this amendment
}
