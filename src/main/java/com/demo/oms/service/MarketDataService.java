package com.demo.oms.service;

import com.demo.oms.domain.Instrument;
import com.demo.oms.dto.MarketDataResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.exception.InstrumentNotFoundException;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.websocket.MarketDataPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MarketDataService {

    @Autowired private InstrumentRepository instrumentRepository;
    @Autowired private MarketDataPublisher marketDataPublisher;

    private final Random rng = new Random();

    public MarketDataResponse getQuote(String symbol) {
        Instrument inst = instrumentRepository.findById(symbol)
                .orElseThrow(() -> new InstrumentNotFoundException(symbol));
        return toMarketDataResponse(inst);
    }

    public List<MarketDataResponse> getQuotes(ExchangeType exchange) {
        return instrumentRepository.findByExchange(exchange).stream()
                .map(this::toMarketDataResponse)
                .collect(Collectors.toList());
    }

    public List<MarketDataResponse> search(String query) {
        return instrumentRepository.searchBySymbolOrName(query).stream()
                .map(this::toMarketDataResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updatePrice(String symbol, BigDecimal price, BigDecimal volume) {
        instrumentRepository.findById(symbol).ifPresent(inst -> {
            if (inst.getOpenPrice() == null) inst.setOpenPrice(price);
            inst.setLastPrice(price);
            if (inst.getHighPrice() == null || price.compareTo(inst.getHighPrice()) > 0) inst.setHighPrice(price);
            if (inst.getLowPrice()  == null || price.compareTo(inst.getLowPrice())  < 0) inst.setLowPrice(price);
            inst.setVolume(inst.getVolume() == null ? volume : inst.getVolume().add(volume));
            inst.setTradedValue(inst.getLastPrice().multiply(volume)
                    .add(inst.getTradedValue() == null ? BigDecimal.ZERO : inst.getTradedValue()));
            inst.setLastUpdated(LocalDateTime.now());

            // check circuit breaker
            if (inst.getUpperCircuitLimit() != null && price.compareTo(inst.getUpperCircuitLimit()) >= 0) {
                inst.setUnderCircuitBreaker(true);
                log.warn("CIRCUIT BREAKER: {} hit upper limit {}", symbol, inst.getUpperCircuitLimit());
            } else if (inst.getLowerCircuitLimit() != null && price.compareTo(inst.getLowerCircuitLimit()) <= 0) {
                inst.setUnderCircuitBreaker(true);
                log.warn("CIRCUIT BREAKER: {} hit lower limit {}", symbol, inst.getLowerCircuitLimit());
            }

            instrumentRepository.save(inst);
            marketDataPublisher.publishQuote(toMarketDataResponse(inst));
        });
    }

    /**
     * Simulates realistic intraday price movement for demo purposes.
     * In production this is replaced by real DSE/CSE data feed.
     */
    @Transactional
    public void simulateMarketTick() {
        List<Instrument> instruments = instrumentRepository.findByTradeableTrue();
        for (Instrument inst : instruments) {
            if (inst.getLastPrice() == null || inst.getLastPrice().compareTo(BigDecimal.ZERO) == 0) continue;

            // random walk: ±0.5% per tick
            double pctChange = (rng.nextGaussian() * 0.003);
            BigDecimal newPrice = inst.getLastPrice()
                    .multiply(BigDecimal.ONE.add(BigDecimal.valueOf(pctChange)))
                    .setScale(2, RoundingMode.HALF_UP);

            // enforce circuit breaker bounds
            if (inst.getUpperCircuitLimit() != null)
                newPrice = newPrice.min(inst.getUpperCircuitLimit());
            if (inst.getLowerCircuitLimit() != null)
                newPrice = newPrice.max(inst.getLowerCircuitLimit());
            if (newPrice.compareTo(new BigDecimal("0.10")) < 0) continue; // floor

            BigDecimal vol = BigDecimal.valueOf(rng.nextInt(10000) + 100L);
            updatePrice(inst.getSymbol(), newPrice, vol);
        }
    }

    private MarketDataResponse toMarketDataResponse(Instrument inst) {
        MarketDataResponse r = new MarketDataResponse();
        r.setSymbol(inst.getSymbol());
        r.setExchange(inst.getExchange() != null ? inst.getExchange().name() : null);
        r.setName(inst.getName());
        r.setLastPrice(inst.getLastPrice());
        r.setOpenPrice(inst.getOpenPrice());
        r.setHighPrice(inst.getHighPrice());
        r.setLowPrice(inst.getLowPrice());
        r.setPreviousClose(inst.getPreviousClose());
        r.setBidPrice(inst.getBidPrice());
        r.setAskPrice(inst.getAskPrice());
        r.setVolume(inst.getVolume());
        r.setTradedValue(inst.getTradedValue());
        r.setUpperCircuitLimit(inst.getUpperCircuitLimit());
        r.setLowerCircuitLimit(inst.getLowerCircuitLimit());
        r.setHalted(inst.isHalted());
        r.setUnderCircuitBreaker(inst.isUnderCircuitBreaker());
        r.setLastUpdated(inst.getLastUpdated());

        if (inst.getLastPrice() != null && inst.getPreviousClose() != null
                && inst.getPreviousClose().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal change = inst.getLastPrice().subtract(inst.getPreviousClose());
            r.setChange(change);
            r.setChangePct(change.divide(inst.getPreviousClose(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
        }
        return r;
    }
}
