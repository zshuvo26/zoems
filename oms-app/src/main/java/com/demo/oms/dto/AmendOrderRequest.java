package com.demo.oms.dto;

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

    private String reason;
}
