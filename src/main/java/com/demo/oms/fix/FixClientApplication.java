package com.demo.oms.fix;

import com.demo.oms.domain.Order;
import com.demo.oms.enums.OrderStatus;
import com.demo.oms.enums.OrderType;
import com.demo.oms.repository.OrderRepository;
import com.demo.oms.service.AuditService;
import com.demo.oms.service.TradeService;
import com.demo.oms.websocket.OrderUpdatePublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import quickfix.*;
import quickfix.field.*;
import quickfix.fix44.ExecutionReport;
import quickfix.fix44.NewOrderSingle;
import quickfix.fix44.OrderCancelReplaceRequest;
import quickfix.fix44.OrderCancelRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class FixClientApplication extends ApplicationAdapter {

    @Autowired private OrderRepository orderRepository;
    @Autowired @Lazy private TradeService tradeService;
    @Autowired @Lazy private AuditService auditService;
    @Autowired @Lazy private OrderUpdatePublisher orderUpdatePublisher;

    private volatile SessionID sessionID;

    // track sent orders to avoid duplicate sends
    private final ConcurrentHashMap<String, Boolean> sentOrders = new ConcurrentHashMap<>();

    @Override
    public void onCreate(SessionID sessionID) {
        this.sessionID = sessionID;
        log.info("FIX session created: {}", sessionID);
    }

    @Override
    public void onLogon(SessionID sessionID) {
        this.sessionID = sessionID;
        log.info("FIX session logged on: {}", sessionID);
    }

    @Override
    public void onLogout(SessionID sessionID) {
        log.warn("FIX session logged out: {}", sessionID);
    }

    @Override
    public void fromApp(Message message, SessionID sessionID)
            throws FieldNotFound, IncorrectDataFormat, IncorrectTagValue, UnsupportedMessageType {
        String msgType = message.getHeader().getString(MsgType.FIELD);

        if (MsgType.EXECUTION_REPORT.equals(msgType)) {
            processExecutionReport((ExecutionReport) message);
        } else {
            log.debug("Received unhandled message type: {}", msgType);
        }
    }

    private void processExecutionReport(ExecutionReport er) {
        try {
            String clOrdId = er.getClOrdID().getValue();
            char execType  = er.getExecType().getValue();
            char ordStatus = er.getOrdStatus().getValue();

            Order order = orderRepository.findByClientOrderId(clOrdId);
            if (order == null) {
                log.warn("Received ExecReport for unknown ClOrdID: {}", clOrdId);
                return;
            }

            OrderStatus prevStatus = order.getStatus();

            // set exchange-assigned order ID if present
            try {
                String exchangeOrderId = er.getOrderID().getValue();
                if (!"NONE".equalsIgnoreCase(exchangeOrderId)) {
                    order.setExchangeOrderId(exchangeOrderId);
                }
            } catch (FieldNotFound ignored) {}

            order.setTransactTime(LocalDateTime.now());

            switch (execType) {
                case ExecType.NEW -> {
                    order.setStatus(OrderStatus.ACKNOWLEDGED);
                    log.info("Order {} acknowledged by exchange", clOrdId);
                }
                case ExecType.PARTIAL_FILL -> {
                    handleFill(order, er, true);
                }
                case ExecType.FILL -> {
                    handleFill(order, er, false);
                }
                case ExecType.CANCELED -> {
                    order.setStatus(OrderStatus.CANCELLED);
                    log.info("Order {} cancelled", clOrdId);
                }
                case ExecType.REPLACED -> {
                    order.setStatus(OrderStatus.ACKNOWLEDGED);
                    // update origClientOrderId chain
                    try {
                        String newClOrdId = er.getString(11); // ClOrdID from replace confirmation
                        order.setOrigClientOrderId(clOrdId);
                        order.setClientOrderId(newClOrdId);
                    } catch (FieldNotFound ignored) {}
                    log.info("Order {} replaced", clOrdId);
                }
                case ExecType.REJECTED -> {
                    order.setStatus(OrderStatus.REJECTED);
                    try {
                        order.setRejectionReason(er.getText().getValue());
                    } catch (FieldNotFound e) {
                        order.setRejectionReason("Rejected by exchange");
                    }
                    log.warn("Order {} rejected: {}", clOrdId, order.getRejectionReason());
                }
                case ExecType.EXPIRED -> {
                    order.setStatus(OrderStatus.EXPIRED);
                    log.info("Order {} expired", clOrdId);
                }
                case ExecType.SUSPENDED -> {
                    order.setStatus(OrderStatus.SUSPENDED);
                    log.warn("Order {} suspended", clOrdId);
                }
                default -> log.debug("Unhandled ExecType '{}' for order {}", execType, clOrdId);
            }

            orderRepository.save(order);
            auditService.log("ORDER", order.getId().toString(), "EXEC_REPORT",
                    order.getAccountId(), "ExecType=" + execType, prevStatus, order.getStatus());

            // push real-time update via WebSocket
            publishOrderUpdate(order);

        } catch (FieldNotFound e) {
            log.error("Missing required field in ExecutionReport", e);
        } catch (Exception e) {
            log.error("Error processing ExecutionReport", e);
        }
    }

    private void handleFill(Order order, ExecutionReport er, boolean partial) throws FieldNotFound {
        double lastQty = er.getLastQty().getValue();
        double lastPx  = er.getLastPx().getValue();
        double cumQty  = er.getCumQty().getValue();

        BigDecimal fillQty   = BigDecimal.valueOf(lastQty);
        BigDecimal fillPrice = BigDecimal.valueOf(lastPx);
        BigDecimal cumFilled = BigDecimal.valueOf(cumQty);

        // weighted average fill price
        BigDecimal prevTotal = order.getAvgFillPrice() != null
                ? order.getAvgFillPrice().multiply(order.getFilledQuantity())
                : BigDecimal.ZERO;
        BigDecimal newFillValue = fillPrice.multiply(fillQty);
        order.setFilledQuantity(cumFilled);
        order.setRemainingQuantity(order.getQuantity().subtract(cumFilled));
        if (cumFilled.compareTo(BigDecimal.ZERO) > 0) {
            order.setAvgFillPrice(prevTotal.add(newFillValue).divide(cumFilled, 4, java.math.RoundingMode.HALF_UP));
        }

        order.setStatus(partial ? OrderStatus.PARTIALLY_FILLED : OrderStatus.FILLED);

        // record trade
        String exchangeTradeId = null;
        try { exchangeTradeId = er.getExecID().getValue(); } catch (FieldNotFound ignored) {}

        tradeService.recordTrade(order, fillQty, fillPrice, exchangeTradeId);

        log.info("Order {} {} qty={} px={}", order.getClientOrderId(),
                partial ? "PARTIAL_FILL" : "FILL", lastQty, lastPx);
    }

    // ── Outbound message builders ──────────────────────────────────────────

    public void sendNewOrderSingle(Order order) {
        requireLoggedOn();

        NewOrderSingle nos = new NewOrderSingle();
        String clOrdId = order.getId().toString();
        order.setClientOrderId(clOrdId);
        order.setStatus(OrderStatus.PENDING_NEW);
        orderRepository.save(order);

        nos.set(new ClOrdID(clOrdId));
        nos.set(new Symbol(order.getSymbol()));
        nos.set(new Side(toFixSide(order.getSide())));
        nos.set(new TransactTime());
        nos.set(new OrdType(toFixOrdType(order.getOrderType())));
        nos.set(new OrderQty(order.getQuantity().doubleValue()));
        nos.set(new TimeInForce(toFixTIF(order.getTimeInForce())));

        if (order.getPrice() != null) nos.set(new Price(order.getPrice().doubleValue()));
        if (order.getStopPrice() != null) nos.set(new StopPx(order.getStopPrice().doubleValue()));

        // HandlInst = 1 (Automated private, no broker intervention)
        nos.set(new HandlInst(HandlInst.AUTOMATED_EXECUTION_ORDER_PRIVATE_NO_BROKER_INTERVENTION));

        // Exchange as SecurityExchange tag
        if (order.getExchange() != null) {
            nos.set(new SecurityExchange(order.getExchange().name()));
        }

        send(nos);
        log.info("Sent NewOrderSingle ClOrdID={} Symbol={} Side={} Qty={} Px={}",
                clOrdId, order.getSymbol(), order.getSide(), order.getQuantity(), order.getPrice());
    }

    public void sendOrderCancelRequest(Order order, String reason) {
        requireLoggedOn();

        String newClOrdId = "CXL-" + order.getId().toString().substring(0, 8);
        OrderCancelRequest req = new OrderCancelRequest();
        req.set(new OrigClOrdID(order.getClientOrderId()));
        req.set(new ClOrdID(newClOrdId));
        req.set(new Symbol(order.getSymbol()));
        req.set(new Side(toFixSide(order.getSide())));
        req.set(new TransactTime());
        req.set(new OrderQty(order.getQuantity().doubleValue()));

        send(req);
        log.info("Sent OrderCancelRequest ClOrdID={} OrigClOrdID={}", newClOrdId, order.getClientOrderId());
    }

    public void sendOrderCancelReplaceRequest(Order order, BigDecimal newQty, BigDecimal newPrice, BigDecimal newStopPrice) {
        requireLoggedOn();

        String newClOrdId = "REP-" + order.getId().toString().substring(0, 8);
        OrderCancelReplaceRequest req = new OrderCancelReplaceRequest();
        req.set(new OrigClOrdID(order.getClientOrderId()));
        req.set(new ClOrdID(newClOrdId));
        req.set(new Symbol(order.getSymbol()));
        req.set(new Side(toFixSide(order.getSide())));
        req.set(new TransactTime());
        req.set(new OrdType(toFixOrdType(order.getOrderType())));
        req.set(new HandlInst(HandlInst.AUTOMATED_EXECUTION_ORDER_PRIVATE_NO_BROKER_INTERVENTION));

        BigDecimal qty = newQty != null ? newQty : order.getQuantity();
        req.set(new OrderQty(qty.doubleValue()));

        if (newPrice != null) req.set(new Price(newPrice.doubleValue()));
        if (newStopPrice != null) req.set(new StopPx(newStopPrice.doubleValue()));

        order.setStatus(OrderStatus.PENDING_REPLACE);
        orderRepository.save(order);

        send(req);
        log.info("Sent OrderCancelReplaceRequest ClOrdID={} OrigClOrdID={}", newClOrdId, order.getClientOrderId());
    }

    // ── FIX field converters ──────────────────────────────────────────────

    private char toFixSide(com.demo.oms.enums.OrderSide side) {
        if (side == null) return Side.BUY;
        return switch (side) {
            case SELL, SELL_SHORT -> Side.SELL;
            default -> Side.BUY;
        };
    }

    private char toFixOrdType(OrderType type) {
        if (type == null) return OrdType.LIMIT;
        return switch (type) {
            case MARKET         -> OrdType.MARKET;
            case STOP           -> OrdType.STOP_STOP_LOSS;
            case STOP_LIMIT     -> OrdType.STOP_LIMIT;
            case MARKET_ON_CLOSE-> OrdType.MARKET_ON_CLOSE;
            case LIMIT_ON_CLOSE -> OrdType.LIMIT_ON_CLOSE;
            default             -> OrdType.LIMIT;
        };
    }

    private char toFixTIF(com.demo.oms.enums.TimeInForce tif) {
        if (tif == null) return TimeInForce.DAY;
        return switch (tif) {
            case GTC -> TimeInForce.GOOD_TILL_CANCEL;
            case IOC -> TimeInForce.IMMEDIATE_OR_CANCEL;
            case FOK -> TimeInForce.FILL_OR_KILL;
            case GTD -> TimeInForce.GOOD_TILL_DATE;
            case OPG -> TimeInForce.AT_THE_OPENING;
            default  -> TimeInForce.DAY;
        };
    }

    private void requireLoggedOn() {
        if (sessionID == null) throw new IllegalStateException("FIX session not yet established");
        Session session = Session.lookupSession(sessionID);
        if (session == null || !session.isLoggedOn()) {
            throw new IllegalStateException("FIX session is not logged on");
        }
    }

    private void send(Message msg) {
        try {
            Session.sendToTarget(msg, sessionID);
        } catch (SessionNotFound e) {
            throw new RuntimeException("Failed to send FIX message: " + e.getMessage(), e);
        }
    }

    private void publishOrderUpdate(Order order) {
        try {
            com.demo.oms.dto.OrderResponse resp = new com.demo.oms.dto.OrderResponse();
            resp.setId(order.getId());
            resp.setClientOrderId(order.getClientOrderId());
            resp.setAccountId(order.getAccountId());
            resp.setSymbol(order.getSymbol());
            resp.setExchange(order.getExchange());
            resp.setSide(order.getSide());
            resp.setOrderType(order.getOrderType());
            resp.setStatus(order.getStatus());
            resp.setQuantity(order.getQuantity());
            resp.setFilledQuantity(order.getFilledQuantity());
            resp.setPrice(order.getPrice());
            resp.setAvgFillPrice(order.getAvgFillPrice());
            resp.setUpdatedAt(order.getUpdatedAt());
            orderUpdatePublisher.publishOrderUpdate(resp);
        } catch (Exception e) {
            log.warn("Failed to publish WebSocket order update", e);
        }
    }

    public boolean isConnected() {
        if (sessionID == null) return false;
        Session s = Session.lookupSession(sessionID);
        return s != null && s.isLoggedOn();
    }
}
