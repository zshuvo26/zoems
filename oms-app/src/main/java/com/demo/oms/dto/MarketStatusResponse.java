package com.demo.oms.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;

@Data
public class MarketStatusResponse {
    private boolean open;
    private boolean preMarket;
    private String session;            // PRE_OPEN, REGULAR, CLOSING, AFTER_HOURS, CLOSED
    private String timezone = "Asia/Dhaka";
    private ZonedDateTime currentTime;
    private ZonedDateTime nextOpen;
    private ZonedDateTime nextClose;
    private String message;
}
