package com.demo.oms.service;

import com.demo.oms.dto.MarketStatusResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.Set;

/**
 * Bangladesh stock market trading schedule (DSE/CSE):
 *  - Trading days: Sunday to Thursday (BD weekend = Friday–Saturday)
 *  - Pre-open session:  09:45 – 10:00 (order entry only, no execution)
 *  - Regular session:  10:00 – 14:30 (continuous trading)
 *  - Closing session:  14:30 – 14:40 (closing auction)
 *  - Timezone: Asia/Dhaka (BST = UTC+6)
 */
@Service
public class MarketHoursService {

    // Set to false in test profile to bypass market-hours gate
    @Value("${market.hours.enabled:true}")
    private boolean marketHoursEnabled;

    private static final ZoneId BD_ZONE = ZoneId.of("Asia/Dhaka");
    private static final LocalTime PRE_OPEN_START = LocalTime.of(9, 45);
    private static final LocalTime MARKET_OPEN    = LocalTime.of(10, 0);
    private static final LocalTime MARKET_CLOSE   = LocalTime.of(14, 30);
    private static final LocalTime CLOSING_END    = LocalTime.of(14, 40);

    // Bangladesh public holidays 2024–2026 (major national/religious)
    private static final Set<LocalDate> BD_HOLIDAYS = Set.of(
        LocalDate.of(2024, 2, 21),   // International Mother Language Day
        LocalDate.of(2024, 3, 26),   // Independence Day
        LocalDate.of(2024, 4, 14),   // Bengali New Year (Pohela Boishakh)
        LocalDate.of(2024, 5, 1),    // May Day
        LocalDate.of(2024, 8, 15),   // National Mourning Day
        LocalDate.of(2024, 12, 16),  // Victory Day
        LocalDate.of(2025, 2, 21),
        LocalDate.of(2025, 3, 26),
        LocalDate.of(2025, 4, 14),
        LocalDate.of(2025, 5, 1),
        LocalDate.of(2025, 8, 15),
        LocalDate.of(2025, 12, 16),
        LocalDate.of(2026, 2, 21),
        LocalDate.of(2026, 3, 26),
        LocalDate.of(2026, 4, 14),
        LocalDate.of(2026, 5, 1),
        LocalDate.of(2026, 8, 15),
        LocalDate.of(2026, 12, 16)
    );

    public boolean isTradingDay() {
        return isTradingDay(ZonedDateTime.now(BD_ZONE).toLocalDate());
    }

    public boolean isTradingDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        // BD working week: Sunday (DayOfWeek.SUNDAY) to Thursday (DayOfWeek.THURSDAY)
        if (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY) return false;
        return !BD_HOLIDAYS.contains(date);
    }

    public boolean isMarketOpen() {
        if (!marketHoursEnabled) return true;
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        if (!isTradingDay(now.toLocalDate())) return false;
        LocalTime time = now.toLocalTime();
        return !time.isBefore(MARKET_OPEN) && time.isBefore(MARKET_CLOSE);
    }

    public boolean isPreOpenSession() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        if (!isTradingDay(now.toLocalDate())) return false;
        LocalTime time = now.toLocalTime();
        return !time.isBefore(PRE_OPEN_START) && time.isBefore(MARKET_OPEN);
    }

    public boolean isOrderEntryAllowed() {
        if (!marketHoursEnabled) return true;
        return isPreOpenSession() || isMarketOpen();
    }

    public boolean isClosingSession() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        if (!isTradingDay(now.toLocalDate())) return false;
        LocalTime time = now.toLocalTime();
        return !time.isBefore(MARKET_CLOSE) && time.isBefore(CLOSING_END);
    }

    public String getCurrentSession() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        if (!isTradingDay(now.toLocalDate())) return "CLOSED";
        LocalTime time = now.toLocalTime();
        if (time.isBefore(PRE_OPEN_START)) return "PRE_MARKET";
        if (time.isBefore(MARKET_OPEN))    return "PRE_OPEN";
        if (time.isBefore(MARKET_CLOSE))   return "REGULAR";
        if (time.isBefore(CLOSING_END))    return "CLOSING";
        return "AFTER_HOURS";
    }

    public ZonedDateTime getNextMarketOpen() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        LocalDate date = now.toLocalDate();
        if (isTradingDay(date) && now.toLocalTime().isBefore(MARKET_OPEN)) {
            return date.atTime(MARKET_OPEN).atZone(BD_ZONE);
        }
        date = date.plusDays(1);
        while (!isTradingDay(date)) date = date.plusDays(1);
        return date.atTime(MARKET_OPEN).atZone(BD_ZONE);
    }

    public ZonedDateTime getNextMarketClose() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        LocalDate date = now.toLocalDate();
        if (isTradingDay(date) && now.toLocalTime().isBefore(MARKET_CLOSE)) {
            return date.atTime(MARKET_CLOSE).atZone(BD_ZONE);
        }
        date = date.plusDays(1);
        while (!isTradingDay(date)) date = date.plusDays(1);
        return date.atTime(MARKET_CLOSE).atZone(BD_ZONE);
    }

    /**
     * Calculates T+2 settlement date skipping BD weekends and holidays.
     */
    public LocalDate getSettlementDate(LocalDate tradeDate) {
        LocalDate date = tradeDate;
        int businessDays = 0;
        while (businessDays < 2) {
            date = date.plusDays(1);
            if (isTradingDay(date)) businessDays++;
        }
        return date;
    }

    public MarketStatusResponse getMarketStatus() {
        ZonedDateTime now = ZonedDateTime.now(BD_ZONE);
        MarketStatusResponse resp = new MarketStatusResponse();
        resp.setOpen(isMarketOpen());
        resp.setPreMarket(isPreOpenSession());
        resp.setSession(getCurrentSession());
        resp.setCurrentTime(now);
        resp.setNextOpen(getNextMarketOpen());
        resp.setNextClose(getNextMarketClose());

        String session = getCurrentSession();
        resp.setMessage(switch (session) {
            case "REGULAR"    -> "Market is open — continuous trading";
            case "PRE_OPEN"   -> "Pre-opening session — order entry only";
            case "CLOSING"    -> "Closing auction in progress";
            case "AFTER_HOURS"-> "Market closed — next open at " + getNextMarketOpen().toLocalTime();
            case "CLOSED"     -> "Market holiday — next trading on " + getNextMarketOpen().toLocalDate();
            default           -> "Pre-market hours";
        });
        return resp;
    }
}
