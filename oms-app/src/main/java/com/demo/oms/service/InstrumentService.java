package com.demo.oms.service;

import com.demo.oms.domain.Instrument;
import com.demo.oms.dto.OhlcvBar;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.exception.InstrumentNotFoundException;
import com.demo.oms.repository.InstrumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class InstrumentService {

    @Autowired private InstrumentRepository instrumentRepository;

    public Instrument getInstrument(String symbol) {
        return instrumentRepository.findById(symbol.toUpperCase())
                .orElseThrow(() -> new InstrumentNotFoundException(symbol));
    }

    public List<Instrument> getAllByExchange(ExchangeType exchange) {
        return instrumentRepository.findByExchange(exchange);
    }

    public Page<Instrument> getFiltered(ExchangeType exchange, String search, String sector, Pageable pageable) {
        String exchangeStr = exchange != null ? exchange.name() : null;
        return instrumentRepository.findFiltered(exchangeStr, sector, search, pageable);
    }

    public List<Instrument> search(String query) {
        return instrumentRepository.searchBySymbolOrName(query);
    }

    public List<Instrument> getByExchangeAndBoard(ExchangeType exchange, String board) {
        return instrumentRepository.findByExchangeAndBoard(exchange, board);
    }

    public List<Instrument> getHalted() {
        return instrumentRepository.findByHaltedTrue();
    }

    public List<String> getSectors(ExchangeType exchange) {
        return instrumentRepository.findDistinctSectors(exchange);
    }

    public List<OhlcvBar> getPriceHistory(String symbol, int days) {
        Instrument inst = getInstrument(symbol);
        BigDecimal basePrice = inst.getPreviousClose() != null ? inst.getPreviousClose() : BigDecimal.valueOf(100);

        List<OhlcvBar> bars = new ArrayList<>();
        LocalDate today = LocalDate.now();
        // Seed with symbol so results are stable between calls
        Random rng = new Random(symbol.hashCode());
        BigDecimal price = basePrice;

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }

            double pctChange = rng.nextGaussian() * 2.0;
            pctChange = Math.max(-9.9, Math.min(9.9, pctChange));
            BigDecimal open  = price;
            BigDecimal close = price.multiply(BigDecimal.valueOf(1 + pctChange / 100))
                                    .setScale(2, RoundingMode.HALF_UP)
                                    .max(BigDecimal.valueOf(0.10));
            BigDecimal high  = close.max(open)
                                    .multiply(BigDecimal.valueOf(1 + Math.abs(rng.nextGaussian()) * 0.4 / 100))
                                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal low   = close.min(open)
                                    .multiply(BigDecimal.valueOf(1 - Math.abs(rng.nextGaussian()) * 0.4 / 100))
                                    .setScale(2, RoundingMode.HALF_UP)
                                    .max(BigDecimal.valueOf(0.10));
            BigDecimal vol   = BigDecimal.valueOf((long) (Math.abs(rng.nextGaussian()) * 50_000 + 10_000));

            bars.add(new OhlcvBar(date.toString(), open, high, low, close, vol));
            price = close;
        }

        // Replace last bar with live data for today
        if (!bars.isEmpty() && inst.getLastPrice() != null) {
            OhlcvBar last = bars.get(bars.size() - 1);
            bars.set(bars.size() - 1, new OhlcvBar(
                today.toString(),
                inst.getOpenPrice()  != null ? inst.getOpenPrice()  : last.getOpen(),
                inst.getHighPrice()  != null ? inst.getHighPrice()  : last.getHigh(),
                inst.getLowPrice()   != null ? inst.getLowPrice()   : last.getLow(),
                inst.getLastPrice(),
                inst.getVolume()     != null ? inst.getVolume()     : last.getVolume()
            ));
        }

        return bars;
    }

    @Transactional
    public void haltInstrument(String symbol, String reason) {
        Instrument inst = getInstrument(symbol);
        inst.setHalted(true);
        inst.setTradeable(false);
        inst.setHaltReason(reason);
        instrumentRepository.save(inst);
    }

    @Transactional
    public void resumeInstrument(String symbol) {
        Instrument inst = getInstrument(symbol);
        inst.setHalted(false);
        inst.setTradeable(true);
        inst.setHaltReason(null);
        inst.setUnderCircuitBreaker(false);
        instrumentRepository.save(inst);
    }

    @Transactional
    public void updateCircuitLimits(String symbol) {
        Instrument inst = getInstrument(symbol);
        if (inst.getPreviousClose() != null && inst.getPreviousClose().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal prev = inst.getPreviousClose();
            BigDecimal upperPct = inst.getCircuitBreakerUpperPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal lowerPct = inst.getCircuitBreakerLowerPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            inst.setUpperCircuitLimit(prev.multiply(BigDecimal.ONE.add(upperPct)).setScale(2, RoundingMode.HALF_UP));
            inst.setLowerCircuitLimit(prev.multiply(BigDecimal.ONE.subtract(lowerPct)).setScale(2, RoundingMode.HALF_UP));
            instrumentRepository.save(inst);
        }
    }

    @Transactional
    public void setOpenPrice(String symbol, BigDecimal openPrice) {
        Instrument inst = getInstrument(symbol);
        inst.setOpenPrice(openPrice);
        inst.setLastPrice(openPrice);
        if (inst.getHighPrice() == null) inst.setHighPrice(openPrice);
        if (inst.getLowPrice() == null)  inst.setLowPrice(openPrice);
        instrumentRepository.save(inst);
    }

    @Transactional
    public void rollOverToNewDay(String symbol, BigDecimal closingPrice) {
        Instrument inst = getInstrument(symbol);
        inst.setPreviousClose(closingPrice);
        inst.setOpenPrice(null);
        inst.setHighPrice(null);
        inst.setLowPrice(null);
        inst.setVolume(BigDecimal.ZERO);
        inst.setTradedValue(BigDecimal.ZERO);
        inst.setUnderCircuitBreaker(false);
        updateCircuitLimits(symbol);
        instrumentRepository.save(inst);
    }
}
