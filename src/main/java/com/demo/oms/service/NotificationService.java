package com.demo.oms.service;

import com.demo.oms.domain.Notification;
import com.demo.oms.domain.Order;
import com.demo.oms.enums.NotificationType;
import com.demo.oms.repository.NotificationRepository;
import com.demo.oms.repository.WatchlistRepository;
import com.demo.oms.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WatchlistRepository watchlistRepository;
    private final InstrumentRepository instrumentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Async
    @Transactional
    public void notifyOrderStatus(Order order) {
        NotificationType type;
        String title;
        String message;

        switch (order.getStatus()) {
            case FILLED -> {
                type = NotificationType.ORDER_FILLED;
                title = "Order Filled — " + order.getSymbol();
                message = String.format("%s %s %s qty=%.0f @ BDT %.2f (avg)",
                        order.getSide(), order.getSymbol(), order.getExchange(),
                        order.getFilledQuantity(), order.getAvgFillPrice());
            }
            case PARTIALLY_FILLED -> {
                type = NotificationType.ORDER_PARTIALLY_FILLED;
                title = "Partial Fill — " + order.getSymbol();
                message = String.format("%s %s filled %.0f/%.0f @ BDT %.2f",
                        order.getSide(), order.getSymbol(),
                        order.getFilledQuantity(), order.getQuantity(), order.getAvgFillPrice());
            }
            case CANCELLED -> {
                type = NotificationType.ORDER_CANCELLED;
                title = "Order Cancelled — " + order.getSymbol();
                message = "Cancelled: " + (order.getCancelReason() != null ? order.getCancelReason() : "Client request");
            }
            case REJECTED -> {
                type = NotificationType.ORDER_REJECTED;
                title = "Order Rejected — " + order.getSymbol();
                message = "Rejected: " + (order.getRejectionReason() != null ? order.getRejectionReason() : "Exchange rejection");
            }
            default -> { return; }
        }

        Notification n = new Notification();
        n.setAccountId(order.getAccountId());
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRelatedEntityId(order.getId().toString());
        notificationRepository.save(n);

        // push over WebSocket
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + order.getAccountId(),
                Map.of("type", type.name(), "title", title, "message", message));
    }

    @Async
    @Transactional
    public void notifyMarginCall(String accountId, BigDecimal utilizationPct) {
        Notification n = new Notification();
        n.setAccountId(accountId);
        n.setType(NotificationType.MARGIN_CALL);
        n.setTitle("MARGIN CALL — Action Required");
        n.setMessage(String.format("Margin utilization at %.1f%%. Please deposit funds or reduce positions.", utilizationPct));
        notificationRepository.save(n);

        messagingTemplate.convertAndSend(
                "/topic/notifications/" + accountId,
                Map.of("type", "MARGIN_CALL", "utilization", utilizationPct));
    }

    @Async
    @Transactional
    public void notifyCorporateAction(String accountId, String symbol, String description) {
        Notification n = new Notification();
        n.setAccountId(accountId);
        n.setType(NotificationType.CORPORATE_ACTION);
        n.setTitle("Corporate Action — " + symbol);
        n.setMessage(description);
        n.setRelatedEntityId(symbol);
        notificationRepository.save(n);
    }

    @Async
    @Transactional
    public void notifyIpoAllotment(String accountId, String ipoId, String symbol, int allottedLots) {
        String msg = allottedLots > 0
                ? String.format("Congratulations! You have been allotted %d lot(s) of %s.", allottedLots, symbol)
                : "Sorry, you were not allotted any shares for " + symbol + ". Refund will be processed.";
        Notification n = new Notification();
        n.setAccountId(accountId);
        n.setType(NotificationType.IPO_ALLOTMENT);
        n.setTitle("IPO Allotment — " + symbol);
        n.setMessage(msg);
        n.setRelatedEntityId(ipoId);
        notificationRepository.save(n);
    }

    // Check watchlist price alerts and fire notifications
    @Transactional
    public void dispatchPriceAlerts() {
        watchlistRepository.findAll().forEach(w -> {
            try {
                instrumentRepository.findById(w.getSymbol()).ifPresent(inst -> {
                    BigDecimal price = inst.getLastPrice();
                    if (price == null) return;

                    if (w.getAlertUpperPrice() != null && !w.getAlertUpperPrice().isBlank()) {
                        BigDecimal alertHigh = new BigDecimal(w.getAlertUpperPrice());
                        if (price.compareTo(alertHigh) >= 0) {
                            Notification n = new Notification();
                            n.setAccountId(w.getAccountId());
                            n.setType(NotificationType.PRICE_ALERT_HIGH);
                            n.setTitle(w.getSymbol() + " crossed high alert");
                            n.setMessage(String.format("%s price BDT %.2f >= alert BDT %.2f",
                                    w.getSymbol(), price, alertHigh));
                            n.setRelatedEntityId(w.getSymbol());
                            notificationRepository.save(n);
                            messagingTemplate.convertAndSend(
                                    "/topic/notifications/" + w.getAccountId(),
                                    Map.of("type", "PRICE_ALERT_HIGH", "symbol", w.getSymbol(), "price", price));
                        }
                    }
                    if (w.getAlertLowerPrice() != null && !w.getAlertLowerPrice().isBlank()) {
                        BigDecimal alertLow = new BigDecimal(w.getAlertLowerPrice());
                        if (price.compareTo(alertLow) <= 0) {
                            Notification n = new Notification();
                            n.setAccountId(w.getAccountId());
                            n.setType(NotificationType.PRICE_ALERT_LOW);
                            n.setTitle(w.getSymbol() + " crossed low alert");
                            n.setMessage(String.format("%s price BDT %.2f <= alert BDT %.2f",
                                    w.getSymbol(), price, alertLow));
                            n.setRelatedEntityId(w.getSymbol());
                            notificationRepository.save(n);
                            messagingTemplate.convertAndSend(
                                    "/topic/notifications/" + w.getAccountId(),
                                    Map.of("type", "PRICE_ALERT_LOW", "symbol", w.getSymbol(), "price", price));
                        }
                    }
                });
            } catch (Exception e) {
                log.warn("Price alert error for {}: {}", w.getSymbol(), e.getMessage());
            }
        });
    }

    public List<Notification> getNotifications(String accountId) {
        return notificationRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    public List<Notification> getUnread(String accountId) {
        return notificationRepository.findByAccountIdAndIsReadFalseOrderByCreatedAtDesc(accountId);
    }

    public long getUnreadCount(String accountId) {
        return notificationRepository.countByAccountIdAndIsReadFalse(accountId);
    }

    public long getTotalCount(String accountId) {
        return notificationRepository.countByAccountId(accountId);
    }

    @Transactional
    public void markRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            notificationRepository.save(n);
        });
    }

    @Transactional
    public int markAllRead(String accountId) {
        return notificationRepository.markAllReadForAccount(accountId);
    }
}
