package com.demo.oms.service;

import com.demo.oms.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BasketOrderService {

    private final OrderService orderService;

    /**
     * Submit a basket of orders. Each order runs through the same pre-trade risk and
     * compliance checks as a single order. If allOrNone=true and any order fails, the
     * result reports all rejected (already-submitted orders are NOT cancelled because
     * they may have already been routed to the exchange — the caller should cancel them).
     */
    public BasketOrderResult submitBasket(BasketOrderRequest req) {
        BasketOrderResult result = new BasketOrderResult();
        result.setBasketName(req.getBasketName());
        result.setTotalOrders(req.getOrders() != null ? req.getOrders().size() : 0);

        List<BasketOrderResult.OrderResult> results = new ArrayList<>();
        int accepted = 0;
        int rejected = 0;
        boolean hasFailure = false;

        if (req.getOrders() == null || req.getOrders().isEmpty()) {
            result.setResults(results);
            return result;
        }

        // Override accountId from basket-level if orders don't specify one
        for (int i = 0; i < req.getOrders().size(); i++) {
            OrderRequest orderReq = req.getOrders().get(i);
            if ((orderReq.getAccountId() == null || orderReq.getAccountId().isBlank())
                    && req.getAccountId() != null) {
                orderReq.setAccountId(req.getAccountId());
            }

            BasketOrderResult.OrderResult r = new BasketOrderResult.OrderResult();
            r.setIndex(i);
            r.setSymbol(orderReq.getSymbol());

            try {
                OrderResponse order = orderService.submitOrder(orderReq);
                r.setSuccess(true);
                r.setOrder(order);
                accepted++;
            } catch (Exception e) {
                r.setSuccess(false);
                r.setErrorCode(extractCode(e));
                r.setErrorMessage(e.getMessage());
                rejected++;
                hasFailure = true;
                log.warn("Basket order {} rejected: {} — {}", i, orderReq.getSymbol(), e.getMessage());
            }
            results.add(r);
        }

        result.setAccepted(accepted);
        result.setRejected(rejected);
        result.setResults(results);

        if (req.isAllOrNone() && hasFailure) {
            log.warn("Basket allOrNone=true but {} orders failed — caller should cancel accepted orders", rejected);
        }

        return result;
    }

    private String extractCode(Exception e) {
        if (e instanceof com.demo.oms.exception.OmsException oe) return oe.getErrorCode();
        if (e instanceof com.demo.oms.exception.RiskLimitException) return "RISK_LIMIT";
        if (e instanceof com.demo.oms.exception.MarketClosedException) return "MARKET_CLOSED";
        return "ORDER_ERROR";
    }
}
