package com.demo.fixserver;

import quickfix.*;
import quickfix.field.*;
import quickfix.fix44.ExecutionReport;
import quickfix.fix44.NewOrderSingle;
import quickfix.fix44.OrderCancelReplaceRequest;
import quickfix.fix44.OrderCancelRequest;

import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Enhanced FIX 4.4 server simulator mimicking a stock exchange gateway.
 * Handles NewOrderSingle, OrderCancelRequest, OrderCancelReplaceRequest.
 * Simulates realistic acknowledgment → (partial) fill sequence.
 */
public class FixServerAcceptor extends ApplicationAdapter {

    private volatile SessionID sessionID;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final Random rng = new Random();
    private final AtomicInteger execCounter = new AtomicInteger(1000);
    private final AtomicInteger ordCounter  = new AtomicInteger(5000);
    private final ConcurrentHashMap<String, NewOrderSingle> pendingOrders = new ConcurrentHashMap<>();

    @Override
    public void onCreate(SessionID sessionID) {
        this.sessionID = sessionID;
        System.out.println("[SIMULATOR] FIX Acceptor session created: " + sessionID);
    }

    @Override
    public void onLogon(SessionID sessionID) {
        this.sessionID = sessionID;
        System.out.println("[SIMULATOR] OMS client logged on");
    }

    @Override
    public void onLogout(SessionID sessionID) {
        System.out.println("[SIMULATOR] OMS client logged out");
    }

    @Override
    public void fromApp(Message message, SessionID sessionID)
            throws FieldNotFound, IncorrectDataFormat, IncorrectTagValue, UnsupportedMessageType {

        String msgType = message.getHeader().getString(MsgType.FIELD);

        switch (msgType) {
            case MsgType.ORDER_SINGLE         -> handleNewOrder((NewOrderSingle) message, sessionID);
            case MsgType.ORDER_CANCEL_REQUEST  -> handleCancel((OrderCancelRequest) message, sessionID);
            case MsgType.ORDER_CANCEL_REPLACE_REQUEST -> handleReplace((OrderCancelReplaceRequest) message, sessionID);
            default -> System.out.println("[SIMULATOR] Ignoring message type: " + msgType);
        }
    }

    private void handleNewOrder(NewOrderSingle order, SessionID sid) throws FieldNotFound {
        String clOrdId = order.getClOrdID().getValue();
        String symbol  = order.getSymbol().getValue();
        char side      = order.getSide().getValue();
        double qty     = order.getOrderQty().getValue();
        char ordType   = order.getOrdType().getValue();

        System.out.printf("[SIMULATOR] New order: ClOrdID=%s Symbol=%s Side=%c Qty=%.0f%n",
                clOrdId, symbol, side, qty);

        pendingOrders.put(clOrdId, order);

        // Step 1: Send ACK (ExecType=NEW)  immediately
        String orderId = "DSE-ORD-" + ordCounter.getAndIncrement();
        sendExecReport(clOrdId, orderId, ExecType.NEW, OrdStatus.NEW,
                qty, 0, 0, 0, qty, null, sid);

        // Step 2: After 500ms–1s, simulate fill(s)
        int delayMs = 500 + rng.nextInt(1000);

        if (ordType == OrdType.MARKET) {
            // Market orders: instant fill
            scheduler.schedule(() -> sendFullFill(clOrdId, orderId, symbol, side, qty, sid), delayMs, TimeUnit.MILLISECONDS);
        } else {
            // Limit orders: 70% chance of full fill, 20% partial, 10% reject
            int roll = rng.nextInt(100);
            if (roll < 10) {
                scheduler.schedule(() -> sendReject(clOrdId, orderId, qty, sid), delayMs, TimeUnit.MILLISECONDS);
            } else if (roll < 30) {
                scheduler.schedule(() -> sendPartialThenFull(clOrdId, orderId, symbol, side, qty, sid), delayMs, TimeUnit.MILLISECONDS);
            } else {
                scheduler.schedule(() -> sendFullFill(clOrdId, orderId, symbol, side, qty, sid), delayMs, TimeUnit.MILLISECONDS);
            }
        }
    }

    private void handleCancel(OrderCancelRequest req, SessionID sid) throws FieldNotFound {
        String origClOrdId = req.getOrigClOrdID().getValue();
        String clOrdId     = req.getClOrdID().getValue();
        double qty         = req.getOrderQty().getValue();

        System.out.printf("[SIMULATOR] Cancel request: OrigClOrdID=%s NewClOrdID=%s%n", origClOrdId, clOrdId);

        pendingOrders.remove(origClOrdId);
        String orderId = "DSE-CXL-" + execCounter.getAndIncrement();

        scheduler.schedule(() ->
            sendExecReport(clOrdId, orderId, ExecType.CANCELED, OrdStatus.CANCELED,
                    qty, 0, 0, 0, qty, null, sid),
            200, TimeUnit.MILLISECONDS);
    }

    private void handleReplace(OrderCancelReplaceRequest req, SessionID sid) throws FieldNotFound {
        String origClOrdId = req.getOrigClOrdID().getValue();
        String clOrdId     = req.getClOrdID().getValue();
        double newQty      = req.getOrderQty().getValue();

        System.out.printf("[SIMULATOR] Replace request: OrigClOrdID=%s NewClOrdID=%s NewQty=%.0f%n",
                origClOrdId, clOrdId, newQty);

        String orderId = "DSE-REP-" + execCounter.getAndIncrement();

        scheduler.schedule(() ->
            sendExecReport(clOrdId, orderId, ExecType.REPLACED, OrdStatus.NEW,
                    newQty, 0, 0, 0, newQty, null, sid),
            300, TimeUnit.MILLISECONDS);
    }

    private void sendFullFill(String clOrdId, String orderId, String symbol, char side, double qty, SessionID sid) {
        double fillPx = generateFillPrice(symbol);
        String execId = "EXEC-" + execCounter.getAndIncrement();
        sendExecReport(clOrdId, orderId, ExecType.FILL, OrdStatus.FILLED,
                qty, qty, fillPx, qty, 0, execId, sid);
        System.out.printf("[SIMULATOR] FILL ClOrdID=%s Qty=%.0f@%.2f%n", clOrdId, qty, fillPx);
    }

    private void sendPartialThenFull(String clOrdId, String orderId, String symbol, char side, double qty, SessionID sid) {
        double partialQty = Math.floor(qty * (0.3 + rng.nextDouble() * 0.4)); // 30–70%
        double fillPx     = generateFillPrice(symbol);

        // Partial fill
        String exec1 = "EXEC-" + execCounter.getAndIncrement();
        sendExecReport(clOrdId, orderId, ExecType.PARTIAL_FILL, OrdStatus.PARTIALLY_FILLED,
                qty, partialQty, fillPx, partialQty, qty - partialQty, exec1, sid);
        System.out.printf("[SIMULATOR] PARTIAL_FILL ClOrdID=%s Qty=%.0f/%.0f@%.2f%n", clOrdId, partialQty, qty, fillPx);

        // Remaining fill after another delay
        double remaining = qty - partialQty;
        double fillPx2   = generateFillPrice(symbol);
        String exec2     = "EXEC-" + execCounter.getAndIncrement();

        scheduler.schedule(() -> {
            sendExecReport(clOrdId, orderId, ExecType.FILL, OrdStatus.FILLED,
                    qty, qty, fillPx2, remaining, 0, exec2, sid);
            System.out.printf("[SIMULATOR] FILL (remainder) ClOrdID=%s Qty=%.0f@%.2f%n", clOrdId, remaining, fillPx2);
        }, 1000 + rng.nextInt(2000), TimeUnit.MILLISECONDS);
    }

    private void sendReject(String clOrdId, String orderId, double qty, SessionID sid) {
        String exec = "EXEC-" + execCounter.getAndIncrement();
        try {
            ExecutionReport er = buildBaseReport(clOrdId, orderId, ExecType.REJECTED, OrdStatus.REJECTED,
                    qty, 0, 0, 0, qty, exec);
            er.set(new Text("Price outside circuit breaker limit"));
            Session.sendToTarget(er, sid);
            System.out.printf("[SIMULATOR] REJECT ClOrdID=%s%n", clOrdId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void sendExecReport(String clOrdId, String orderId, char execType, char ordStatus,
                                 double orderQty, double cumQty, double lastPx, double lastQty,
                                 double leavesQty, String execId, SessionID sid) {
        try {
            String eid = execId != null ? execId : "EXEC-" + execCounter.getAndIncrement();
            ExecutionReport er = buildBaseReport(clOrdId, orderId, execType, ordStatus,
                    orderQty, cumQty, lastPx, lastQty, leavesQty, eid);
            Session.sendToTarget(er, sid);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private ExecutionReport buildBaseReport(String clOrdId, String orderId, char execType, char ordStatus,
                                             double orderQty, double cumQty, double lastPx, double lastQty,
                                             double leavesQty, String execId) throws Exception {
        ExecutionReport er = new ExecutionReport();
        er.set(new OrderID(orderId));
        er.set(new ClOrdID(clOrdId));
        er.set(new ExecID(execId));
        er.set(new ExecType(execType));
        er.set(new OrdStatus(ordStatus));
        er.set(new Symbol("BD")); // placeholder; real exchange echoes symbol
        er.set(new Side(Side.BUY));
        er.set(new OrderQty(orderQty));
        er.set(new CumQty(cumQty));
        er.set(new AvgPx(lastPx));
        er.set(new LastQty(lastQty));
        er.set(new LastPx(lastPx));
        er.set(new LeavesQty(leavesQty));
        er.set(new TransactTime());
        return er;
    }

    private double generateFillPrice(String symbol) {
        // Generate a random fill price around typical Bangladesh stock prices
        // In production this comes from the order book matching engine
        double base = 100 + rng.nextDouble() * 900;
        return Math.round(base * 10.0) / 10.0;
    }

    public static void main(String[] args) {
        try {
            SessionSettings settings = new SessionSettings("server.cfg");
            Application application = new FixServerAcceptor();
            MessageStoreFactory storeFactory = new FileStoreFactory(settings);
            LogFactory logFactory = new FileLogFactory(settings);
            quickfix.MessageFactory messageFactory = new DefaultMessageFactory();

            Acceptor acceptor = new SocketAcceptor(application, storeFactory, settings, logFactory, messageFactory);
            acceptor.start();
            System.out.println("[SIMULATOR] FIX Acceptor started on port 9878 — DSE/CSE Exchange Simulator");
            Thread.currentThread().join();
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
