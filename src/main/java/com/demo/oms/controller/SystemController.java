package com.demo.oms.controller;

import com.demo.oms.dto.ApiResponse;
import com.demo.oms.fix.FixClientApplication;
import com.demo.oms.service.MarketHoursService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "System", description = "System health and connectivity status")
@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    @Autowired private FixClientApplication fixClient;
    @Autowired private MarketHoursService marketHoursService;

    @Operation(summary = "System health — FIX connectivity, market status, server time")
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("status", "UP");
        info.put("application", "Professional OMS — Bangladesh Stock Market");
        info.put("version", "2.0.0");
        info.put("serverTime", ZonedDateTime.now(ZoneId.of("Asia/Dhaka")).toString());
        info.put("timezone", "Asia/Dhaka (BST = UTC+6)");
        info.put("fixConnected", fixClient.isConnected());
        info.put("marketSession", marketHoursService.getCurrentSession());
        info.put("marketOpen", marketHoursService.isMarketOpen());
        info.put("tradingDay", marketHoursService.isTradingDay());
        info.put("nextMarketOpen", marketHoursService.getNextMarketOpen().toString());
        info.put("exchanges", new String[]{"DSE (Dhaka Stock Exchange)", "CSE (Chittagong Stock Exchange)"});
        info.put("currency", "BDT (Bangladeshi Taka)");
        info.put("settlement", "T+2 (next 2 business days)");
        info.put("fixProtocol", "FIX 4.4");
        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @Operation(summary = "Get all WebSocket subscription topics")
    @GetMapping("/ws-topics")
    public ResponseEntity<ApiResponse<Map<String, String>>> wsTopics() {
        Map<String, String> topics = new LinkedHashMap<>();
        topics.put("/ws (SockJS endpoint)", "Connect via SockJS/STOMP");
        topics.put("/topic/orders/{accountId}", "Real-time order status updates for an account");
        topics.put("/topic/orders/all", "All order updates (dealer feed)");
        topics.put("/topic/trades/{accountId}", "Trade execution notifications");
        topics.put("/topic/market-data/{symbol}", "Live price ticks per symbol (e.g. /topic/market-data/GP)");
        topics.put("/topic/market-status", "Market open/close/circuit events");
        return ResponseEntity.ok(ApiResponse.ok(topics));
    }
}
