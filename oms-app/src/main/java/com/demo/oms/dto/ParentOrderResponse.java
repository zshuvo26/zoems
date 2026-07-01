package com.demo.oms.dto;

import com.demo.oms.domain.ParentOrder;
import com.demo.oms.enums.AssetClass;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ParentOrderResponse {

    private UUID id;
    private String accountId;
    private String boid;
    private String dealerId;
    private String symbol;
    private String isin;
    private ExchangeType exchange;
    private AssetClass assetClass;
    private OrderSide side;
    private BigDecimal totalQuantity;
    private BigDecimal executedQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal priceLimit;
    private int numSlices;
    private int completedSlices;
    private String status;
    private double progressPct;
    private String notes;
    private List<OrderResponse> children;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ParentOrderResponse from(ParentOrder po, List<OrderResponse> children) {
        ParentOrderResponse r = new ParentOrderResponse();
        r.setId(po.getId());
        r.setAccountId(po.getAccountId());
        r.setBoid(po.getBoid());
        r.setDealerId(po.getDealerId());
        r.setSymbol(po.getSymbol());
        r.setIsin(po.getIsin());
        r.setExchange(po.getExchange());
        r.setAssetClass(po.getAssetClass());
        r.setSide(po.getSide());
        r.setTotalQuantity(po.getTotalQuantity());
        r.setExecutedQuantity(po.getExecutedQuantity());
        r.setRemainingQuantity(po.getRemainingQuantity());
        r.setPriceLimit(po.getPriceLimit());
        r.setNumSlices(po.getNumSlices());
        r.setCompletedSlices(po.getCompletedSlices());
        r.setStatus(po.getStatus());
        r.setNotes(po.getNotes());
        r.setChildren(children);
        r.setProgressPct(po.getNumSlices() > 0
            ? (double) po.getCompletedSlices() / po.getNumSlices() * 100.0 : 0.0);
        r.setCreatedAt(po.getCreatedAt());
        r.setUpdatedAt(po.getUpdatedAt());
        return r;
    }
}
