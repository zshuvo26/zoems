package com.demo.oms.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCancelRequest {

    @NotEmpty(message = "At least one order ID is required")
    private List<String> orderIds;

    private String reason = "Bulk cancellation";
}
