package com.demo.oms;

import com.demo.oms.dto.OrderRequest;
import com.demo.oms.dto.AmendOrderRequest;
import com.demo.oms.dto.CancelOrderRequest;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderType;
import com.demo.oms.enums.TimeInForce;
import com.demo.oms.fix.FixClientApplication;
import com.demo.oms.service.MarketHoursService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    // disable FIX connection for unit tests (no live simulator needed)
    "fix.host=127.0.0.1",
    "fix.port=19999"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OmsApplicationTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired MarketHoursService marketHoursService;

    // Mock out FIX so orders don't get REJECTED due to no live simulator
    @MockBean FixClientApplication fixClient;

    static String createdAccountId = "1201880012345678"; // seeded by DataInitializer
    static String createdOrderId;

    // ── 1. Application context ─────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(1)
    @DisplayName("1. Application context loads")
    void contextLoads() {
        assertNotNull(mvc);
    }

    // ── 2. System health ──────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(2)
    @DisplayName("2. System health endpoint returns UP")
    void systemHealthReturnsUp() throws Exception {
        mvc.perform(get("/api/v1/system/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.currency").value(containsString("BDT")))
                .andExpect(jsonPath("$.data.settlement").value(containsString("T+2")));
    }

    // ── 3. Market status ─────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(3)
    @DisplayName("3. Market status endpoint returns Bangladesh hours")
    void marketStatusContainsBangladeshInfo() throws Exception {
        mvc.perform(get("/api/v1/market/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.timezone").value("Asia/Dhaka"))
                .andExpect(jsonPath("$.data.session").exists())
                .andExpect(jsonPath("$.data.nextOpen").exists());
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @DisplayName("4. MarketHoursService: BD weekends are not trading days")
    void bdWeekendsAreNotTradingDays() {
        // Friday and Saturday are BD weekends
        var friday   = java.time.LocalDate.of(2026, 6, 26); // a Friday
        var saturday = java.time.LocalDate.of(2026, 6, 27); // a Saturday
        var sunday   = java.time.LocalDate.of(2026, 6, 28); // a Sunday (trading day)
        assertFalse(marketHoursService.isTradingDay(friday),   "Friday should not be a trading day");
        assertFalse(marketHoursService.isTradingDay(saturday), "Saturday should not be a trading day");
        assertTrue(marketHoursService.isTradingDay(sunday),    "Sunday should be a trading day");
    }

    @Test
    @org.junit.jupiter.api.Order(5)
    @DisplayName("5. MarketHoursService: T+2 settlement skips BD weekends")
    void settlementSkipsBdWeekends() {
        // Thursday June 25: +1=Fri(skip), +1=Sat(skip), +1=Sun(1st BD day), +1=Mon(2nd BD day) → Jun 29
        var thursday = java.time.LocalDate.of(2026, 6, 25); // Thursday
        var expected = java.time.LocalDate.of(2026, 6, 29); // Monday
        assertEquals(expected, marketHoursService.getSettlementDate(thursday));

        // Sunday trade → Mon (1st), Tue (2nd) → settlement Tuesday
        var sunday   = java.time.LocalDate.of(2026, 6, 28);
        var expected2 = java.time.LocalDate.of(2026, 6, 30); // Tuesday
        assertEquals(expected2, marketHoursService.getSettlementDate(sunday));
    }

    // ── 4. Instruments ──────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(6)
    @DisplayName("6. DSE instruments are seeded")
    void dseInstrumentsSeeded() throws Exception {
        mvc.perform(get("/api/v1/instruments?exchange=DSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThan(30))));
    }

    @Test
    @org.junit.jupiter.api.Order(7)
    @DisplayName("7. Get GP (Grameenphone) instrument")
    void getGrameenphoneInstrument() throws Exception {
        mvc.perform(get("/api/v1/instruments/GP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.symbol").value("GP"))
                .andExpect(jsonPath("$.data.exchange").value("DSE"))
                .andExpect(jsonPath("$.data.sector").value("Telecommunication"))
                .andExpect(jsonPath("$.data.tradeable").value(true))
                .andExpect(jsonPath("$.data.circuitBreakerUpperPct").value(10.0));
    }

    @Test
    @org.junit.jupiter.api.Order(8)
    @DisplayName("8. Instrument search by name")
    void instrumentSearchByName() throws Exception {
        mvc.perform(get("/api/v1/instruments/search?q=pharma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))));
    }

    @Test
    @org.junit.jupiter.api.Order(9)
    @DisplayName("9. Market data quote for SQURPHARMA")
    void marketDataQuote() throws Exception {
        mvc.perform(get("/api/v1/market/quote/SQURPHARMA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.symbol").value("SQURPHARMA"))
                .andExpect(jsonPath("$.data.lastPrice").exists())
                .andExpect(jsonPath("$.data.upperCircuitLimit").exists())
                .andExpect(jsonPath("$.data.lowerCircuitLimit").exists());
    }

    @Test
    @org.junit.jupiter.api.Order(10)
    @DisplayName("10. Market quote for unknown symbol returns 404")
    void unknownSymbolReturns404() throws Exception {
        mvc.perform(get("/api/v1/market/quote/UNKNOWN_XYZ"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INSTRUMENT_NOT_FOUND"));
    }

    // ── 5. Accounts ─────────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(11)
    @DisplayName("11. Demo account is seeded with BDT 5 lakh balance")
    void demoAccountSeeded() throws Exception {
        mvc.perform(get("/api/v1/accounts/" + createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(createdAccountId))
                .andExpect(jsonPath("$.data.cashBalance").value(500000.00))
                .andExpect(jsonPath("$.data.accountType").value("INDIVIDUAL"));
    }

    @Test
    @org.junit.jupiter.api.Order(12)
    @DisplayName("12. Deposit funds increases cash balance")
    void depositFunds() throws Exception {
        mvc.perform(post("/api/v1/accounts/{id}/deposit?amount=100000", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cashBalance").value(600000.00))
                .andExpect(jsonPath("$.data.availableFunds").value(600000.00));
    }

    @Test
    @org.junit.jupiter.api.Order(13)
    @DisplayName("13. Withdraw funds decreases cash balance")
    void withdrawFunds() throws Exception {
        mvc.perform(post("/api/v1/accounts/{id}/withdraw?amount=50000", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cashBalance").value(550000.00));
    }

    @Test
    @org.junit.jupiter.api.Order(14)
    @DisplayName("14. Over-withdrawal rejected with RISK_LIMIT_BREACH")
    void overWithdrawalRejected() throws Exception {
        mvc.perform(post("/api/v1/accounts/{id}/withdraw?amount=9999999", createdAccountId))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RISK_LIMIT_BREACH"));
    }

    @Test
    @org.junit.jupiter.api.Order(15)
    @DisplayName("15. Risk limits can be retrieved")
    void getRiskLimits() throws Exception {
        mvc.perform(get("/api/v1/accounts/{id}/risk-limits", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxOrderValue").exists())
                .andExpect(jsonPath("$.data.maxLossPerDay").exists());
    }

    // ── 6. Orders ────────────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(16)
    @DisplayName("16. Valid order request is accepted (market closed → LIMIT DAY allowed)")
    void submitLimitOrder() throws Exception {
        OrderRequest req = new OrderRequest();
        req.setAccountId(createdAccountId);
        req.setSymbol("GP");
        req.setExchange(ExchangeType.DSE);
        req.setSide(OrderSide.BUY);
        req.setOrderType(OrderType.LIMIT);
        req.setTimeInForce(TimeInForce.DAY);
        req.setQuantity(new BigDecimal("100"));
        req.setPrice(new BigDecimal("305.00"));
        req.setSource("TEST");

        MvcResult result = mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.symbol").value("GP"))
                .andExpect(jsonPath("$.data.side").value("BUY"))
                .andExpect(jsonPath("$.data.quantity").value(100))
                .andExpect(jsonPath("$.data.price").value(305.00))
                .andExpect(jsonPath("$.data.currency").value("BDT"))
                .andExpect(jsonPath("$.data.settlementDate").exists())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        createdOrderId = mapper.readTree(body).path("data").path("id").asText();
        assertFalse(createdOrderId.isEmpty(), "Order ID must be set");
    }

    @Test
    @org.junit.jupiter.api.Order(17)
    @DisplayName("17. Market order rejected when market is closed")
    void marketOrderRejectedWhenClosed() throws Exception {
        // Market is almost certainly closed during test runs (non-BST hours)
        if (marketHoursService.isMarketOpen()) {
            // Skip this specific check if market happens to be open
            return;
        }
        OrderRequest req = new OrderRequest();
        req.setAccountId(createdAccountId);
        req.setSymbol("GP");
        req.setExchange(ExchangeType.DSE);
        req.setSide(OrderSide.BUY);
        req.setOrderType(OrderType.MARKET);
        req.setQuantity(new BigDecimal("10"));
        req.setSource("TEST");

        mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("MARKET_CLOSED"));
    }

    @Test
    @org.junit.jupiter.api.Order(18)
    @DisplayName("18. Order with missing required fields fails validation")
    void orderValidationFails() throws Exception {
        mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.data.accountId").exists());
    }

    @Test
    @org.junit.jupiter.api.Order(19)
    @DisplayName("19. Order with price above circuit breaker is rejected")
    void priceAboveCircuitBreakerRejected() throws Exception {
        // GP previous close 309, upper circuit = 309 * 1.10 = 339.90
        OrderRequest req = new OrderRequest();
        req.setAccountId(createdAccountId);
        req.setSymbol("GP");
        req.setExchange(ExchangeType.DSE);
        req.setSide(OrderSide.BUY);
        req.setOrderType(OrderType.LIMIT);
        req.setQuantity(new BigDecimal("10"));
        req.setPrice(new BigDecimal("9999.00")); // way above circuit
        req.setSource("TEST");

        mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RISK_LIMIT_BREACH"))
                .andExpect(jsonPath("$.message").value(containsString("circuit")));
    }

    @Test
    @org.junit.jupiter.api.Order(20)
    @DisplayName("20. Insufficient funds buy order is rejected")
    void insufficientFundsRejected() throws Exception {
        OrderRequest req = new OrderRequest();
        req.setAccountId(createdAccountId);
        req.setSymbol("BERGERPBL");
        req.setExchange(ExchangeType.DSE);
        req.setSide(OrderSide.BUY);
        req.setOrderType(OrderType.LIMIT);
        req.setQuantity(new BigDecimal("100000")); // 100k shares × 1850 = 185 crore BDT
        req.setPrice(new BigDecimal("1850.00"));
        req.setSource("TEST");

        mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RISK_LIMIT_BREACH"));
    }

    @Test
    @org.junit.jupiter.api.Order(21)
    @DisplayName("21. Get order by ID")
    void getOrderById() throws Exception {
        Assumptions.assumeTrue(createdOrderId != null, "Requires order from test 16");
        mvc.perform(get("/api/v1/orders/{id}", createdOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(createdOrderId))
                .andExpect(jsonPath("$.data.symbol").value("GP"));
    }

    @Test
    @org.junit.jupiter.api.Order(22)
    @DisplayName("22. Get all orders for account")
    void getOrdersByAccount() throws Exception {
        mvc.perform(get("/api/v1/orders/account/{id}", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))));
    }

    @Test
    @org.junit.jupiter.api.Order(23)
    @DisplayName("23. Get open orders for account")
    void getOpenOrders() throws Exception {
        mvc.perform(get("/api/v1/orders/account/{id}/open", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @org.junit.jupiter.api.Order(24)
    @DisplayName("24. Amend order – price change")
    void amendOrder() throws Exception {
        Assumptions.assumeTrue(createdOrderId != null, "Requires order from test 16");

        AmendOrderRequest req = new AmendOrderRequest();
        req.setNewPrice(new BigDecimal("308.00"));
        req.setNewQuantity(new BigDecimal("90"));
        req.setReason("Price improvement");

        mvc.perform(patch("/api/v1/orders/{id}", createdOrderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.price").value(308.00))
                .andExpect(jsonPath("$.data.quantity").value(90));
    }

    @Test
    @org.junit.jupiter.api.Order(25)
    @DisplayName("25. Cancel order – sends cancel request")
    void cancelOrder() throws Exception {
        // Create a fresh order to cancel
        OrderRequest req = new OrderRequest();
        req.setAccountId(createdAccountId);
        req.setSymbol("BRACBANK");
        req.setExchange(ExchangeType.DSE);
        req.setSide(OrderSide.BUY);
        req.setOrderType(OrderType.LIMIT);
        req.setTimeInForce(TimeInForce.GTC);
        req.setQuantity(new BigDecimal("50"));
        req.setPrice(new BigDecimal("44.00"));

        MvcResult r = mvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String ordId = mapper.readTree(r.getResponse().getContentAsString())
                .path("data").path("id").asText();

        CancelOrderRequest cancelReq = new CancelOrderRequest();
        cancelReq.setReason("Changed mind");

        mvc.perform(delete("/api/v1/orders/{id}", ordId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelReason").value("Changed mind"));
    }

    @Test
    @org.junit.jupiter.api.Order(26)
    @DisplayName("26. Get non-existent order returns 404")
    void nonExistentOrderReturns404() throws Exception {
        mvc.perform(get("/api/v1/orders/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("ORDER_NOT_FOUND"));
    }

    @Test
    @org.junit.jupiter.api.Order(27)
    @DisplayName("27. Order audit trail is populated")
    void orderAuditTrail() throws Exception {
        Assumptions.assumeTrue(createdOrderId != null, "Requires order from test 16");
        // Audit is async — small wait
        Thread.sleep(300);
        mvc.perform(get("/api/v1/orders/{id}/audit", createdOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // ── 7. Portfolio ─────────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(28)
    @DisplayName("28. Portfolio response is returned")
    void portfolioResponse() throws Exception {
        mvc.perform(get("/api/v1/portfolio/{id}", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountId").value(createdAccountId))
                .andExpect(jsonPath("$.data.cashBalance").exists())
                .andExpect(jsonPath("$.data.positions").isArray())
                .andExpect(jsonPath("$.data.asOf").exists());
    }

    @Test
    @org.junit.jupiter.api.Order(29)
    @DisplayName("29. Mark-to-market endpoint works")
    void markToMarket() throws Exception {
        mvc.perform(post("/api/v1/portfolio/{id}/mark-to-market", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── 8. Watchlist ─────────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(30)
    @DisplayName("30. Watchlist add and retrieve with live quotes")
    void watchlistAddAndRetrieve() throws Exception {
        // Add GP to watchlist
        mvc.perform(post("/api/v1/watchlists/{id}", createdAccountId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"GP\",\"exchange\":\"DSE\",\"name\":\"My List\"}"))
                .andExpect(status().isCreated());

        // Add BRACBANK
        mvc.perform(post("/api/v1/watchlists/{id}", createdAccountId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"BRACBANK\",\"exchange\":\"DSE\",\"name\":\"My List\"}"))
                .andExpect(status().isCreated());

        // Retrieve watchlist with quotes
        mvc.perform(get("/api/v1/watchlists/{id}", createdAccountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(2))));
    }

    // ── 9. Sectors ───────────────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(31)
    @DisplayName("31. DSE sectors list is populated")
    void dsesSectors() throws Exception {
        mvc.perform(get("/api/v1/instruments/sectors?exchange=DSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(4))))
                .andExpect(jsonPath("$.data", hasItem("Banks")))
                .andExpect(jsonPath("$.data", hasItem("Pharmaceuticals")));
    }

    // ── 10. WebSocket topics ─────────────────────────────────────────

    @Test
    @org.junit.jupiter.api.Order(32)
    @DisplayName("32. WebSocket topics info endpoint")
    void wsTopicsEndpoint() throws Exception {
        mvc.perform(get("/api/v1/system/ws-topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data./topic/orders/{accountId}").exists())
                .andExpect(jsonPath("$.data./topic/market-data/{symbol}").exists());
    }
}
