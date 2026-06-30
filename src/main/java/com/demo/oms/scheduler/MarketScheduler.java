package com.demo.oms.scheduler;

import com.demo.oms.domain.Order;
import com.demo.oms.enums.OrderStatus;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.OrderRepository;
import com.demo.oms.service.AlgoOrderService;
import com.demo.oms.service.CorporateActionService;
import com.demo.oms.service.MarketDataService;
import com.demo.oms.service.MarketHoursService;
import com.demo.oms.service.NotificationService;
import com.demo.oms.service.PositionService;
import com.demo.oms.service.SettlementService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@EnableScheduling
@Component
public class MarketScheduler {

    @Autowired private MarketHoursService marketHoursService;
    @Autowired private MarketDataService marketDataService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private InstrumentRepository instrumentRepository;
    @Autowired private PositionService positionService;
    @Autowired private AlgoOrderService algoOrderService;
    @Autowired private CorporateActionService corporateActionService;
    @Autowired private SettlementService settlementService;
    @Autowired private NotificationService notificationService;

    // Simulate market data ticks every 5 seconds during trading hours
    @Scheduled(fixedDelay = 5000)
    public void marketDataTick() {
        if (marketHoursService.isMarketOpen()) {
            try {
                marketDataService.simulateMarketTick();
                algoOrderService.executePendingSlices();
            } catch (Exception e) {
                log.error("Error during market data tick", e);
            }
        }
    }

    // Every 30 seconds during trading hours: dispatch price alerts from watchlist
    @Scheduled(fixedDelay = 30000)
    public void priceAlertTick() {
        if (marketHoursService.isMarketOpen()) {
            try {
                notificationService.dispatchPriceAlerts();
            } catch (Exception e) {
                log.debug("Price alert tick error: {}", e.getMessage());
            }
        }
    }

    // At market open (10:00 BST) — expire DAY orders from yesterday, reset circuit breakers, process settlements + corporate actions
    @Scheduled(cron = "0 0 10 * * SUN-THU", zone = "Asia/Dhaka")
    public void onMarketOpen() {
        log.info("=== DSE/CSE MARKET OPEN (10:00 BST) ===");
        expireOldDayOrders();
        resetCircuitBreakers();
        try { settlementService.processMaturedSettlements(); } catch (Exception e) { log.error("Settlement processing error", e); }
        try { corporateActionService.processMatureCorporateActions(); } catch (Exception e) { log.error("Corporate action processing error", e); }
    }

    // At market close (14:30 BST) — expire remaining DAY orders
    @Scheduled(cron = "0 30 14 * * SUN-THU", zone = "Asia/Dhaka")
    public void onMarketClose() {
        log.info("=== DSE/CSE MARKET CLOSE (14:30 BST) ===");
        expireDayOrders();
        performEodMarkToMarket();
    }

    // Mark-to-market all positions every 30 minutes during trading hours
    @Scheduled(cron = "0 0/30 10-14 * * SUN-THU", zone = "Asia/Dhaka")
    public void periodicMarkToMarket() {
        if (marketHoursService.isMarketOpen()) {
            log.debug("Running periodic mark-to-market");
            List<String> accounts = orderRepository.findAll().stream()
                    .map(Order::getAccountId).distinct().toList();
            accounts.forEach(accountId -> {
                try {
                    positionService.markToMarket(accountId);
                } catch (Exception e) {
                    log.error("MTM failed for account {}", accountId, e);
                }
            });
        }
    }

    private void expireOldDayOrders() {
        List<Order> orders = orderRepository.findByStatusIn(
                List.of(OrderStatus.NEW, OrderStatus.PENDING_NEW, OrderStatus.ACKNOWLEDGED));
        for (Order o : orders) {
            if (o.getTimeInForce() == com.demo.oms.enums.TimeInForce.DAY) {
                o.setStatus(OrderStatus.EXPIRED);
                orderRepository.save(o);
                log.info("Expired stale DAY order: {}", o.getId());
            }
        }
    }

    private void expireDayOrders() {
        List<Order> orders = orderRepository.findByStatusIn(
                List.of(OrderStatus.ACKNOWLEDGED, OrderStatus.PARTIALLY_FILLED));
        for (Order o : orders) {
            if (o.getTimeInForce() == com.demo.oms.enums.TimeInForce.DAY) {
                o.setStatus(OrderStatus.DONE_FOR_DAY);
                orderRepository.save(o);
                log.info("EOD: Order {} marked DONE_FOR_DAY", o.getId());
            }
        }
    }

    private void resetCircuitBreakers() {
        instrumentRepository.findAll().forEach(inst -> {
            if (inst.isUnderCircuitBreaker()) {
                inst.setUnderCircuitBreaker(false);
                instrumentRepository.save(inst);
            }
        });
    }

    private void performEodMarkToMarket() {
        log.info("Performing EOD mark-to-market for all accounts");
        List<String> accounts = orderRepository.findAll().stream()
                .map(Order::getAccountId).distinct().toList();
        accounts.forEach(accountId -> {
            try {
                positionService.markToMarket(accountId);
            } catch (Exception e) {
                log.error("EOD MTM failed for account {}", accountId, e);
            }
        });
    }
}
