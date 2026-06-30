package com.demo.oms.service;

import com.demo.oms.domain.Instrument;
import com.demo.oms.dto.MarketBreadthResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketBreadthService {

    private final InstrumentRepository instrumentRepository;

    public MarketBreadthResponse getBreadth(ExchangeType exchange) {
        List<Instrument> instruments = instrumentRepository.findByExchange(exchange)
                .stream().filter(i -> i.getLastPrice() != null).collect(Collectors.toList());

        MarketBreadthResponse resp = new MarketBreadthResponse();
        resp.setExchange(exchange.name());
        resp.setAsOf(ZonedDateTime.now(ZoneId.of("Asia/Dhaka")).toString());
        resp.setTotalInstruments(instruments.size());

        int adv = 0, dec = 0, unc = 0;
        BigDecimal totalVol = BigDecimal.ZERO;
        BigDecimal totalVal = BigDecimal.ZERO;

        for (Instrument i : instruments) {
            BigDecimal last  = i.getLastPrice();
            BigDecimal prev  = i.getPreviousClose();
            if (prev != null && prev.compareTo(BigDecimal.ZERO) > 0) {
                int cmp = last.compareTo(prev);
                if (cmp > 0) adv++;
                else if (cmp < 0) dec++;
                else unc++;
            }
            if (i.getVolume() != null) totalVol = totalVol.add(i.getVolume());
            if (i.getTradedValue() != null) totalVal = totalVal.add(i.getTradedValue());
        }

        resp.setAdvancers(adv);
        resp.setDecliners(dec);
        resp.setUnchanged(unc);
        resp.setAdvanceDeclineRatio(dec > 0
                ? BigDecimal.valueOf(adv).divide(BigDecimal.valueOf(dec), 2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(adv));
        resp.setTotalVolume(totalVol);
        resp.setTotalTradedValue(totalVal);

        // Simple index level: price-weighted average of all instruments
        BigDecimal indexLevel = instruments.stream()
                .map(Instrument::getLastPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (!instruments.isEmpty()) {
            indexLevel = indexLevel.divide(BigDecimal.valueOf(instruments.size()), 2, RoundingMode.HALF_UP);
        }
        resp.setIndexLevel(indexLevel);

        // Index change: weighted average change%
        BigDecimal avgChange = instruments.stream()
                .filter(i -> i.getPreviousClose() != null && i.getPreviousClose().compareTo(BigDecimal.ZERO) > 0)
                .map(i -> i.getLastPrice().subtract(i.getPreviousClose())
                           .divide(i.getPreviousClose(), 6, RoundingMode.HALF_UP)
                           .multiply(BigDecimal.valueOf(100)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long withPrev = instruments.stream()
                .filter(i -> i.getPreviousClose() != null && i.getPreviousClose().compareTo(BigDecimal.ZERO) > 0)
                .count();
        if (withPrev > 0) {
            avgChange = avgChange.divide(BigDecimal.valueOf(withPrev), 2, RoundingMode.HALF_UP);
        }
        resp.setIndexChangePct(avgChange);
        resp.setIndexChange(indexLevel.multiply(avgChange).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));

        // Top 10 gainers (by % change)
        resp.setTopGainers(instruments.stream()
                .filter(i -> i.getPreviousClose() != null && i.getPreviousClose().compareTo(BigDecimal.ZERO) > 0)
                .map(i -> toMover(i))
                .filter(m -> m.getChangePct().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(MarketBreadthResponse.MoverEntry::getChangePct).reversed())
                .limit(10)
                .collect(Collectors.toList()));

        // Top 10 losers
        resp.setTopLosers(instruments.stream()
                .filter(i -> i.getPreviousClose() != null && i.getPreviousClose().compareTo(BigDecimal.ZERO) > 0)
                .map(i -> toMover(i))
                .filter(m -> m.getChangePct().compareTo(BigDecimal.ZERO) < 0)
                .sorted(Comparator.comparing(MarketBreadthResponse.MoverEntry::getChangePct))
                .limit(10)
                .collect(Collectors.toList()));

        // Most active by volume
        resp.setMostActive(instruments.stream()
                .filter(i -> i.getVolume() != null && i.getVolume().compareTo(BigDecimal.ZERO) > 0)
                .map(i -> toMover(i))
                .sorted(Comparator.comparing(MarketBreadthResponse.MoverEntry::getVolume).reversed())
                .limit(10)
                .collect(Collectors.toList()));

        return resp;
    }

    private MarketBreadthResponse.MoverEntry toMover(Instrument i) {
        MarketBreadthResponse.MoverEntry m = new MarketBreadthResponse.MoverEntry();
        m.setSymbol(i.getSymbol());
        m.setName(i.getName());
        m.setLastPrice(i.getLastPrice());
        m.setBoard(i.getBoard());

        if (i.getPreviousClose() != null && i.getPreviousClose().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal change = i.getLastPrice().subtract(i.getPreviousClose());
            BigDecimal changePct = change.divide(i.getPreviousClose(), 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            m.setChange(change.setScale(2, RoundingMode.HALF_UP));
            m.setChangePct(changePct);
        } else {
            m.setChange(BigDecimal.ZERO);
            m.setChangePct(BigDecimal.ZERO);
        }

        m.setVolume(i.getVolume() != null ? i.getVolume() : BigDecimal.ZERO);
        m.setTradedValue(i.getTradedValue() != null ? i.getTradedValue() : BigDecimal.ZERO);
        return m;
    }
}
