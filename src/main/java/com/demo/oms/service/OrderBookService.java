package com.demo.oms.service;

import com.demo.oms.domain.Instrument;
import com.demo.oms.dto.OrderBookResponse;
import com.demo.oms.exception.InstrumentNotFoundException;
import com.demo.oms.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OrderBookService {

    private final InstrumentRepository instrumentRepository;
    private final Random random = new Random();

    /**
     * Generates a simulated 5-level L2 order book from the instrument's last price.
     * In production this would be sourced from the exchange's market data feed.
     */
    public OrderBookResponse getOrderBook(String symbol) {
        Instrument inst = instrumentRepository.findById(symbol.toUpperCase())
                .orElseThrow(() -> new InstrumentNotFoundException(symbol));

        BigDecimal last  = inst.getLastPrice() != null ? inst.getLastPrice() : BigDecimal.ZERO;
        BigDecimal prev  = inst.getPreviousClose();
        BigDecimal tick  = inst.getTickSize() != null ? inst.getTickSize() : new BigDecimal("0.10");

        OrderBookResponse resp = new OrderBookResponse();
        resp.setSymbol(symbol.toUpperCase());
        resp.setExchange(inst.getExchange() != null ? inst.getExchange().name() : "DSE");
        resp.setTimestamp(ZonedDateTime.now(ZoneId.of("Asia/Dhaka")).toString());
        resp.setLastPrice(last);
        resp.setPrevClose(prev);

        if (prev != null && prev.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal change = last.subtract(prev);
            BigDecimal changePct = change.divide(prev, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            resp.setChange(change.setScale(2, RoundingMode.HALF_UP));
            resp.setChangePct(changePct);
        }

        // Build bid side (buy orders below last price)
        List<OrderBookResponse.BookLevel> bids = new ArrayList<>();
        BigDecimal totalBidQty = BigDecimal.ZERO;
        for (int level = 1; level <= 5; level++) {
            BigDecimal bidPrice = last.subtract(tick.multiply(BigDecimal.valueOf(level)))
                    .setScale(2, RoundingMode.HALF_UP);
            if (bidPrice.compareTo(BigDecimal.ZERO) <= 0) break;
            // Cap at lower circuit limit
            if (inst.getLowerCircuitLimit() != null && bidPrice.compareTo(inst.getLowerCircuitLimit()) < 0) {
                bidPrice = inst.getLowerCircuitLimit();
            }
            BigDecimal qty = randomQty(200, 5000);
            totalBidQty = totalBidQty.add(qty);
            OrderBookResponse.BookLevel bl = new OrderBookResponse.BookLevel();
            bl.setLevel(level);
            bl.setPrice(bidPrice);
            bl.setQuantity(qty);
            bl.setOrderCount(random.nextInt(1, 15));
            bids.add(bl);
        }

        // Build ask side (sell orders above last price)
        List<OrderBookResponse.BookLevel> asks = new ArrayList<>();
        BigDecimal totalAskQty = BigDecimal.ZERO;
        for (int level = 1; level <= 5; level++) {
            BigDecimal askPrice = last.add(tick.multiply(BigDecimal.valueOf(level)))
                    .setScale(2, RoundingMode.HALF_UP);
            // Cap at upper circuit limit
            if (inst.getUpperCircuitLimit() != null && askPrice.compareTo(inst.getUpperCircuitLimit()) > 0) {
                askPrice = inst.getUpperCircuitLimit();
            }
            BigDecimal qty = randomQty(100, 4000);
            totalAskQty = totalAskQty.add(qty);
            OrderBookResponse.BookLevel al = new OrderBookResponse.BookLevel();
            al.setLevel(level);
            al.setPrice(askPrice);
            al.setQuantity(qty);
            al.setOrderCount(random.nextInt(1, 12));
            asks.add(al);
        }

        resp.setBids(bids);
        resp.setAsks(asks);
        resp.setTotalBidQty(totalBidQty);
        resp.setTotalAskQty(totalAskQty);

        if (!bids.isEmpty() && !asks.isEmpty()) {
            BigDecimal bestBid = bids.get(0).getPrice();
            BigDecimal bestAsk = asks.get(0).getPrice();
            BigDecimal spread = bestAsk.subtract(bestBid).setScale(2, RoundingMode.HALF_UP);
            resp.setBidAskSpread(spread);
            resp.setBidAskSpreadPct(last.compareTo(BigDecimal.ZERO) > 0
                    ? spread.divide(last, 6, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).setScale(4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
        }

        return resp;
    }

    private BigDecimal randomQty(int min, int max) {
        return BigDecimal.valueOf(min + random.nextInt(max - min))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)); // round to nearest 100
    }
}
