package com.demo.oms.service;

import com.demo.oms.domain.PriceAlert;
import com.demo.oms.domain.PriceAlert.AlertCondition;
import com.demo.oms.domain.Instrument;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceAlertService {

    private final PriceAlertRepository alertRepo;
    private final InstrumentRepository instrumentRepo;

    public List<PriceAlert> getByAccount(String accountId) {
        return alertRepo.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    @Transactional
    public PriceAlert create(PriceAlert alert) {
        return alertRepo.save(alert);
    }

    @Transactional
    public void delete(String alertId, String accountId) {
        alertRepo.findById(alertId).ifPresent(a -> {
            if (a.getAccountId().equals(accountId)) alertRepo.delete(a);
        });
    }

    @Transactional
    public PriceAlert toggleActive(String alertId, String accountId) {
        PriceAlert a = alertRepo.findById(alertId)
            .filter(x -> x.getAccountId().equals(accountId))
            .orElseThrow(() -> new RuntimeException("Alert not found"));
        a.setActive(!a.isActive());
        return alertRepo.save(a);
    }

    // Evaluated every 30 seconds against live market data
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void evaluateAlerts() {
        List<PriceAlert> active = alertRepo.findByActiveTrue();
        for (PriceAlert alert : active) {
            try {
                Instrument inst = instrumentRepo.findById(alert.getSymbol() + "_" + alert.getExchange())
                    .orElseGet(() -> instrumentRepo.findAll().stream()
                        .filter(i -> i.getSymbol().equals(alert.getSymbol()) &&
                                     i.getExchange().name().equals(alert.getExchange()))
                        .findFirst().orElse(null));
                if (inst == null) continue;
                BigDecimal last     = inst.getLastPrice();
                BigDecimal prev     = inst.getPreviousClose() != null ? inst.getPreviousClose() : last;
                boolean   triggered = false;

                switch (alert.getCondition()) {
                    case ABOVE   -> triggered = last.compareTo(alert.getTargetPrice()) >= 0;
                    case BELOW   -> triggered = last.compareTo(alert.getTargetPrice()) <= 0;
                    case PCT_UP  -> {
                        if (prev.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal chg = last.subtract(prev).multiply(BigDecimal.valueOf(100)).divide(prev, 2, java.math.RoundingMode.HALF_UP);
                            triggered = chg.compareTo(alert.getPercentThreshold()) >= 0;
                        }
                    }
                    case PCT_DOWN -> {
                        if (prev.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal chg = prev.subtract(last).multiply(BigDecimal.valueOf(100)).divide(prev, 2, java.math.RoundingMode.HALF_UP);
                            triggered = chg.compareTo(alert.getPercentThreshold()) >= 0;
                        }
                    }
                }

                if (triggered) {
                    alert.setTriggered(true);
                    alert.setActive(false);
                    alert.setTriggeredAt(LocalDateTime.now());
                    alertRepo.save(alert);
                    log.info("Price alert triggered: {} {} {} @ {}", alert.getAccountId(), alert.getSymbol(), alert.getCondition(), last);
                }
            } catch (Exception e) {
                log.debug("Alert evaluation error for {}: {}", alert.getId(), e.getMessage());
            }
        }
    }
}
