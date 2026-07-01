package com.demo.oms.service;

import com.demo.oms.domain.Account;
import com.demo.oms.domain.Instrument;
import com.demo.oms.domain.Order;
import com.demo.oms.dto.*;
import com.demo.oms.enums.*;
import com.demo.oms.exception.MarketClosedException;
import com.demo.oms.exception.OmsException;
import com.demo.oms.exception.OrderNotFoundException;
import com.demo.oms.fix.FixClientApplication;
import com.demo.oms.repository.*;
import com.demo.oms.websocket.OrderUpdatePublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OrderService {

    @Autowired private OrderRepository orderRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private InstrumentRepository instrumentRepository;
    @Autowired private FixClientApplication fixClient;
    @Autowired private RiskManagementService riskService;
    @Autowired private MarketHoursService marketHoursService;
    @Autowired private AuditService auditService;
    @Autowired private OrderUpdatePublisher orderUpdatePublisher;
    @Autowired private ComplianceService complianceService;
    @Autowired private NotificationService notificationService;

    /**
     * Submit a new order. Enforces market hours, pre-trade risk, then sends via FIX.
     */
    @Transactional
    public OrderResponse submitOrder(OrderRequest req) {
        // 1. Market hours check (MARKET orders require regular session)
        if (req.getOrderType() == OrderType.MARKET && !marketHoursService.isMarketOpen()) {
            throw new MarketClosedException("Market orders can only be placed during regular trading hours (10:00–14:30 BST, Sun–Thu). Current session: " + marketHoursService.getCurrentSession());
        }
        if (!marketHoursService.isOrderEntryAllowed()) {
            throw new MarketClosedException("Order entry is only allowed during pre-open (09:45–10:00) or regular session (10:00–14:30). Current session: " + marketHoursService.getCurrentSession());
        }

        // 2. Build order entity
        Order order = buildOrder(req);

        // 3. Pre-trade compliance check (restricted securities, wash trade, duplicates)
        complianceService.checkPreTrade(req.getAccountId(), req.getSymbol(),
                req.getSide(), req.getQuantity(), req.getPrice(), req.getOrderType());

        // 4. Pre-trade risk validation
        riskService.validateOrder(order);

        // 5. Compute financial fields
        computeOrderFinancials(order);

        // 6. Block funds for buy orders
        if (order.getSide() == OrderSide.BUY && order.getGrossValue() != null) {
            Account account = accountRepository.findById(order.getAccountId()).orElseThrow();
            riskService.blockFunds(account, order.getGrossValue());
        }

        // 7. T+2 settlement date
        order.setSettlementDate(marketHoursService.getSettlementDate(LocalDate.now()).toString());

        // 8. Persist
        order = orderRepository.save(order);

        // 8. Send to exchange via FIX
        try {
            fixClient.sendNewOrderSingle(order);
        } catch (Exception e) {
            order.setStatus(OrderStatus.REJECTED);
            order.setRejectionReason("FIX send failure: " + e.getMessage());
            order = orderRepository.save(order);
            log.error("FIX send failed for order {}", order.getId(), e);
        }

        auditService.log("ORDER", order.getId().toString(), "CREATE",
                order.getAccountId(), "New order submitted: " + order.getSymbol() + " " + order.getSide(), null, order);

        OrderResponse resp = toResponse(order);
        orderUpdatePublisher.publishOrderUpdate(resp);
        return resp;
    }

    /**
     * Cancel an active order by ID.
     */
    @Transactional
    public OrderResponse cancelOrder(String orderId, CancelOrderRequest req) {
        Order order = findById(orderId);
        assertCancellable(order);

        String reason = req != null ? req.getReason() : "Client requested cancellation";
        order.setCancelReason(reason);
        order.setStatus(OrderStatus.PENDING_CANCEL);
        order = orderRepository.save(order);
        fixClient.sendOrderCancelRequest(order, reason);

        auditService.log("ORDER", orderId, "CANCEL", order.getAccountId(), "Cancel requested: " + reason, null, null);

        OrderResponse resp = toResponse(order);
        orderUpdatePublisher.publishOrderUpdate(resp);
        return resp;
    }

    /**
     * Amend an active order (price/quantity change) via FIX OrderCancelReplaceRequest.
     */
    @Transactional
    public OrderResponse amendOrder(String orderId, AmendOrderRequest req) {
        Order order = findById(orderId);

        if (order.getStatus() != OrderStatus.ACKNOWLEDGED &&
            order.getStatus() != OrderStatus.PARTIALLY_FILLED &&
            order.getStatus() != OrderStatus.PENDING_NEW &&
            order.getStatus() != OrderStatus.NEW) {
            throw new OmsException("INVALID_STATE", "Order cannot be amended in status: " + order.getStatus());
        }

        // Validate new price against circuit breakers
        if (req.getNewPrice() != null) {
            instrumentRepository.findById(order.getSymbol()).ifPresent(inst -> {
                if (inst.getUpperCircuitLimit() != null && req.getNewPrice().compareTo(inst.getUpperCircuitLimit()) > 0)
                    throw new com.demo.oms.exception.RiskLimitException("New price exceeds upper circuit limit");
                if (inst.getLowerCircuitLimit() != null && req.getNewPrice().compareTo(inst.getLowerCircuitLimit()) < 0)
                    throw new com.demo.oms.exception.RiskLimitException("New price below lower circuit limit");
            });
        }

        fixClient.sendOrderCancelReplaceRequest(order, req.getNewQuantity(), req.getNewPrice(), req.getNewStopPrice());

        // optimistically update fields pending exchange confirmation
        if (req.getNewPrice() != null)    order.setPrice(req.getNewPrice());
        if (req.getNewQuantity() != null) order.setQuantity(req.getNewQuantity());
        if (req.getNewStopPrice() != null) order.setStopPrice(req.getNewStopPrice());
        order = orderRepository.save(order);

        auditService.log("ORDER", orderId, "AMEND", order.getAccountId(),
                "Amend requested: qty=" + req.getNewQuantity() + " px=" + req.getNewPrice(), null, null);

        return toResponse(order);
    }

    public OrderResponse getOrder(String orderId) {
        return toResponse(findById(orderId));
    }

    public List<OrderResponse> getOrdersByAccount(String accountId) {
        return orderRepository.findByAccountIdOrderByCreatedAtDesc(accountId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<OrderResponse> getOpenOrders(String accountId) {
        return orderRepository.findOpenOrdersByAccount(accountId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<OrderResponse> getOrdersByStatus(String accountId, OrderStatus status) {
        return orderRepository.findByAccountIdAndStatus(accountId, status)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<OrderResponse> searchOrders(OrderSearchRequest req) {
        LocalDateTime dateFrom = req.getDateFrom() != null ? req.getDateFrom().atStartOfDay() : null;
        LocalDateTime dateTo   = req.getDateTo()   != null ? req.getDateTo().atTime(23, 59, 59) : null;
        return orderRepository.search(
            req.getAccountId(), req.getSymbol(), req.getIsin(), req.getBoid(),
            req.getDealerId(), req.getExchange(), req.getStatus(), req.getSide(),
            dateFrom, dateTo
        ).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<OrderResponse> bulkCancel(BulkCancelRequest req) {
        List<OrderResponse> results = new ArrayList<>();
        for (String orderId : req.getOrderIds()) {
            try {
                CancelOrderRequest cancel = new CancelOrderRequest();
                cancel.setReason(req.getReason());
                results.add(cancelOrder(orderId, cancel));
            } catch (Exception e) {
                log.warn("Bulk cancel failed for order {}: {}", orderId, e.getMessage());
            }
        }
        return results;
    }

    @Transactional
    public OrderResponse cloneOrder(String orderId) {
        Order source = findById(orderId);
        OrderRequest req = new OrderRequest();
        req.setAccountId(source.getAccountId());
        req.setBoid(source.getBoid());
        req.setDealerId(source.getDealerId());
        req.setSymbol(source.getSymbol());
        req.setIsin(source.getIsin());
        req.setExchange(source.getExchange());
        req.setSide(source.getSide());
        req.setOrderType(source.getOrderType());
        req.setTimeInForce(source.getTimeInForce());
        req.setQuantity(source.getQuantity());
        req.setPrice(source.getPrice());
        req.setStopPrice(source.getStopPrice());
        req.setDisplayQuantity(source.getDisplayQuantity());
        req.setAssetClass(source.getAssetClass());
        req.setSettlementType(source.getSettlementType());
        req.setSource("CLONE");
        req.setRemarks("Cloned from order " + orderId);
        return submitOrder(req);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Order buildOrder(OrderRequest req) {
        Order o = new Order();
        o.setAccountId(req.getAccountId());
        o.setBoid(req.getBoid());
        o.setDealerId(req.getDealerId());
        o.setSymbol(req.getSymbol().toUpperCase().trim());
        o.setIsin(req.getIsin());
        o.setExchange(req.getExchange());
        o.setSide(req.getSide());
        o.setOrderType(req.getOrderType());
        o.setTimeInForce(req.getTimeInForce() != null ? req.getTimeInForce() : TimeInForce.DAY);
        o.setAssetClass(req.getAssetClass() != null ? req.getAssetClass() : AssetClass.EQUITY);
        o.setSettlementType(req.getSettlementType() != null ? req.getSettlementType() : SettlementType.T2);
        o.setQuantity(req.getQuantity());
        o.setPrice(req.getPrice());
        o.setStopPrice(req.getStopPrice());
        o.setDisplayQuantity(req.getDisplayQuantity());
        o.setExpireDate(req.getExpireDate());
        o.setSource(req.getSource() != null ? req.getSource() : "API");
        o.setText(req.getText());
        o.setRemarks(req.getRemarks());
        o.setDealerNotes(req.getDealerNotes());
        o.setStatus(OrderStatus.NEW);
        o.setFilledQuantity(BigDecimal.ZERO);
        o.setRemainingQuantity(req.getQuantity());
        o.setCurrency("BDT");

        // inherit board and ISIN from instrument master
        instrumentRepository.findById(o.getSymbol()).ifPresent(inst -> {
            o.setBoard(inst.getBoard());
            if (o.getIsin() == null) o.setIsin(inst.getIsin());
        });

        return o;
    }

    private void computeOrderFinancials(Order o) {
        if (o.getPrice() != null) {
            o.setGrossValue(o.getQuantity().multiply(o.getPrice()).setScale(2, RoundingMode.HALF_UP));
            BigDecimal commission = o.getGrossValue().multiply(new BigDecimal("0.005"))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal tax = o.getGrossValue().multiply(new BigDecimal("0.0005"))
                    .setScale(2, RoundingMode.HALF_UP);
            o.setCommission(commission);
            o.setTax(tax);
            o.setNetValue(o.getGrossValue().add(commission).add(tax));
        }
    }

    private void assertCancellable(Order order) {
        if (order.getStatus() == OrderStatus.FILLED ||
            order.getStatus() == OrderStatus.CANCELLED ||
            order.getStatus() == OrderStatus.REJECTED ||
            order.getStatus() == OrderStatus.EXPIRED) {
            throw new OmsException("INVALID_STATE", "Cannot cancel order in status: " + order.getStatus());
        }
        if (order.getStatus() == OrderStatus.PENDING_CANCEL) {
            throw new OmsException("ALREADY_PENDING_CANCEL", "Cancel request already in flight");
        }
    }

    private Order findById(String orderId) {
        try {
            return orderRepository.findById(UUID.fromString(orderId))
                    .orElseThrow(() -> new OrderNotFoundException(orderId));
        } catch (IllegalArgumentException e) {
            // also try by clientOrderId
            Order o = orderRepository.findByClientOrderId(orderId);
            if (o == null) throw new OrderNotFoundException(orderId);
            return o;
        }
    }

    public OrderResponse toResponse(Order o) {
        OrderResponse r = new OrderResponse();
        r.setId(o.getId());
        r.setClientOrderId(o.getClientOrderId());
        r.setExchangeOrderId(o.getExchangeOrderId());
        r.setAccountId(o.getAccountId());
        r.setBoid(o.getBoid());
        r.setDealerId(o.getDealerId());
        r.setDealerName(o.getDealerName());
        r.setSymbol(o.getSymbol());
        r.setIsin(o.getIsin());
        r.setExchange(o.getExchange());
        r.setAssetClass(o.getAssetClass());
        r.setBoard(o.getBoard());
        r.setSide(o.getSide());
        r.setOrderType(o.getOrderType());
        r.setTimeInForce(o.getTimeInForce());
        r.setSettlementType(o.getSettlementType());
        r.setStatus(o.getStatus());
        r.setQuantity(o.getQuantity());
        r.setFilledQuantity(o.getFilledQuantity());
        r.setRemainingQuantity(o.getRemainingQuantity());
        r.setPrice(o.getPrice());
        r.setStopPrice(o.getStopPrice());
        r.setAvgFillPrice(o.getAvgFillPrice());
        r.setGrossValue(o.getGrossValue());
        r.setCommission(o.getCommission());
        r.setTax(o.getTax());
        r.setNetValue(o.getNetValue());
        r.setCurrency(o.getCurrency());
        r.setRejectionReason(o.getRejectionReason());
        r.setCancelReason(o.getCancelReason());
        r.setText(o.getText());
        r.setRemarks(o.getRemarks());
        r.setDealerNotes(o.getDealerNotes());
        r.setSource(o.getSource());
        r.setParentOrderId(o.getParentOrderId());
        r.setSettlementDate(o.getSettlementDate());
        r.setSettled(o.isSettled());
        r.setCreatedAt(o.getCreatedAt());
        r.setUpdatedAt(o.getUpdatedAt());
        r.setTransactTime(o.getTransactTime());
        return r;
    }
}
