package com.demo.oms.websocket;

import com.demo.oms.dto.OrderResponse;
import com.demo.oms.dto.TradeResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class OrderUpdatePublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishOrderUpdate(OrderResponse order) {
        try {
            // broadcast to account-specific channel
            messagingTemplate.convertAndSend(
                    "/topic/orders/" + order.getAccountId(), order);
            // broadcast to global order feed (for dealer workstations)
            messagingTemplate.convertAndSend("/topic/orders/all", order);
        } catch (Exception e) {
            log.warn("Failed to publish order update {}: {}", order.getId(), e.getMessage());
        }
    }

    public void publishTradeNotification(TradeResponse trade) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/trades/" + trade.getAccountId(), trade);
        } catch (Exception e) {
            log.warn("Failed to publish trade notification {}: {}", trade.getTradeId(), e.getMessage());
        }
    }
}
