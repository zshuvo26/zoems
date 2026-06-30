package com.demo.oms.websocket;

import com.demo.oms.dto.MarketDataResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class MarketDataPublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishQuote(MarketDataResponse quote) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/market-data/" + quote.getSymbol(), quote);
        } catch (Exception e) {
            log.warn("Failed to publish market data for {}: {}", quote.getSymbol(), e.getMessage());
        }
    }
}
