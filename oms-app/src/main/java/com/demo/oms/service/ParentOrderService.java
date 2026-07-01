package com.demo.oms.service;

import com.demo.oms.domain.ParentOrder;
import com.demo.oms.dto.*;
import com.demo.oms.enums.OrderType;
import com.demo.oms.enums.SettlementType;
import com.demo.oms.enums.TimeInForce;
import com.demo.oms.exception.OmsException;
import com.demo.oms.repository.OrderRepository;
import com.demo.oms.repository.ParentOrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ParentOrderService {

    @Autowired private ParentOrderRepository parentOrderRepo;
    @Autowired private OrderRepository orderRepo;
    @Autowired private OrderService orderService;

    /**
     * Creates a parent order and splits it into numSlices child orders,
     * distributing totalQuantity as evenly as possible.
     */
    @Transactional
    public ParentOrderResponse createParentOrder(ParentOrderRequest req) {
        ParentOrder parent = new ParentOrder();
        parent.setAccountId(req.getAccountId());
        parent.setBoid(req.getBoid());
        parent.setDealerId(req.getDealerId());
        parent.setSymbol(req.getSymbol().toUpperCase().trim());
        parent.setIsin(req.getIsin());
        parent.setExchange(req.getExchange());
        parent.setSide(req.getSide());
        parent.setAssetClass(req.getAssetClass());
        parent.setTotalQuantity(req.getTotalQuantity());
        parent.setRemainingQuantity(req.getTotalQuantity());
        parent.setExecutedQuantity(BigDecimal.ZERO);
        parent.setPriceLimit(req.getPriceLimit());
        parent.setNumSlices(req.getNumSlices());
        parent.setNotes(req.getNotes());
        parent.setStatus("ACTIVE");
        parent = parentOrderRepo.save(parent);

        // Split totalQuantity into numSlices child orders
        List<OrderResponse> children = new ArrayList<>();
        BigDecimal baseSlice = req.getTotalQuantity()
            .divide(BigDecimal.valueOf(req.getNumSlices()), 0, RoundingMode.DOWN);
        BigDecimal remainder = req.getTotalQuantity().subtract(baseSlice.multiply(BigDecimal.valueOf(req.getNumSlices())));

        for (int i = 0; i < req.getNumSlices(); i++) {
            BigDecimal sliceQty = (i == 0) ? baseSlice.add(remainder) : baseSlice;
            if (sliceQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            OrderRequest childReq = new OrderRequest();
            childReq.setAccountId(req.getAccountId());
            childReq.setBoid(req.getBoid());
            childReq.setDealerId(req.getDealerId());
            childReq.setSymbol(req.getSymbol());
            childReq.setIsin(req.getIsin());
            childReq.setExchange(req.getExchange());
            childReq.setSide(req.getSide());
            childReq.setAssetClass(req.getAssetClass());
            childReq.setOrderType(req.getPriceLimit() != null ? OrderType.LIMIT : OrderType.MARKET);
            childReq.setPrice(req.getPriceLimit());
            childReq.setQuantity(sliceQty);
            childReq.setTimeInForce(TimeInForce.DAY);
            childReq.setSettlementType(SettlementType.T2);
            childReq.setSource("PARENT_SPLIT");
            childReq.setDealerNotes("Slice " + (i + 1) + "/" + req.getNumSlices() + " of parent " + parent.getId());

            try {
                OrderResponse child = orderService.submitOrder(childReq);
                // Set parentOrderId on the saved order
                UUID parentId = parent.getId();
                orderRepo.findById(child.getId()).ifPresent(o -> {
                    o.setParentOrderId(parentId);
                    orderRepo.save(o);
                });
                child.setParentOrderId(parent.getId());
                children.add(child);
            } catch (Exception e) {
                log.warn("Child order {} of parent {} failed: {}", i + 1, parent.getId(), e.getMessage());
            }
        }

        parent.setCompletedSlices(0);
        parentOrderRepo.save(parent);

        return ParentOrderResponse.from(parent, children);
    }

    public ParentOrderResponse get(UUID parentId, OrderService svc) {
        ParentOrder parent = parentOrderRepo.findById(parentId)
            .orElseThrow(() -> new OmsException("NOT_FOUND", "Parent order not found: " + parentId));
        List<OrderResponse> children = orderRepo.findByParentOrderId(parentId)
            .stream().map(svc::toResponse).collect(Collectors.toList());
        return ParentOrderResponse.from(parent, children);
    }

    public List<ParentOrderResponse> getByAccount(String accountId) {
        return parentOrderRepo.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
            .map(po -> {
                List<OrderResponse> kids = orderRepo.findByParentOrderId(po.getId())
                    .stream().map(orderService::toResponse).collect(Collectors.toList());
                return ParentOrderResponse.from(po, kids);
            }).collect(Collectors.toList());
    }
}
