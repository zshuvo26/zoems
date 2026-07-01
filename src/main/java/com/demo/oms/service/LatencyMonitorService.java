package com.demo.oms.service;

import com.demo.oms.domain.LatencyMetric;
import com.demo.oms.dto.LatencyReportResponse;
import com.demo.oms.repository.LatencyMetricRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class LatencyMonitorService {

    private static final long ALERT_THRESHOLD_MS = 200L;

    @Autowired private LatencyMetricRepository latencyRepo;

    @Transactional
    public void record(String component, long latencyMs, String orderId) {
        LatencyMetric m = new LatencyMetric();
        m.setComponent(component);
        m.setLatencyMs(latencyMs);
        m.setOrderId(orderId);
        m.setAlert(latencyMs >= ALERT_THRESHOLD_MS);
        latencyRepo.save(m);
        if (m.isAlert()) {
            log.warn("LATENCY ALERT: {} = {}ms orderId={}", component, latencyMs, orderId);
        }
    }

    public LatencyReportResponse getReport(int periodHours) {
        LocalDateTime since = LocalDateTime.now().minusHours(periodHours);
        List<LatencyMetric> all = latencyRepo.findAllSince(since);

        Map<String, List<Long>> byComponent = new LinkedHashMap<>();
        String[] components = {"OMS_EMS", "EMS_GATEWAY", "GATEWAY_EXCHANGE",
                               "EXCHANGE_GATEWAY", "GATEWAY_OMS", "END_TO_END"};
        for (String c : components) byComponent.put(c, new ArrayList<>());

        for (LatencyMetric m : all) {
            byComponent.computeIfAbsent(m.getComponent(), k -> new ArrayList<>()).add(m.getLatencyMs());
        }

        Map<String, LatencyReportResponse.ComponentStats> statsMap = new LinkedHashMap<>();
        for (Map.Entry<String, List<Long>> entry : byComponent.entrySet()) {
            List<Long> samples = entry.getValue();
            LatencyReportResponse.ComponentStats s = new LatencyReportResponse.ComponentStats();
            s.setComponent(entry.getKey());
            s.setSampleCount(samples.size());
            if (!samples.isEmpty()) {
                Collections.sort(samples);
                s.setAvgMs(samples.stream().mapToLong(v -> v).average().orElse(0));
                s.setP50Ms(percentile(samples, 50));
                s.setP95Ms(percentile(samples, 95));
                s.setP99Ms(percentile(samples, 99));
                s.setAlertCount(samples.stream().filter(v -> v >= ALERT_THRESHOLD_MS).count());
                double avg = s.getAvgMs();
                s.setStatus(avg < 50 ? "GREEN" : avg < 200 ? "YELLOW" : "RED");
            } else {
                s.setStatus("UNKNOWN");
            }
            statsMap.put(entry.getKey(), s);
        }

        List<LatencyReportResponse.AlertEntry> recentAlerts = latencyRepo.findRecentAlerts(since)
            .stream().limit(20).map(m -> {
                LatencyReportResponse.AlertEntry a = new LatencyReportResponse.AlertEntry();
                a.setComponent(m.getComponent());
                a.setLatencyMs(m.getLatencyMs());
                a.setOrderId(m.getOrderId());
                a.setTimestamp(m.getTimestamp());
                return a;
            }).collect(Collectors.toList());

        LatencyReportResponse resp = new LatencyReportResponse();
        resp.setPeriodHours(periodHours + "h");
        resp.setComponentStats(statsMap);
        resp.setRecentAlerts(recentAlerts);
        resp.setTotalSamples(all.size());
        resp.setTotalAlerts(all.stream().filter(LatencyMetric::isAlert).count());
        return resp;
    }

    private double percentile(List<Long> sorted, int pct) {
        if (sorted.isEmpty()) return 0;
        int idx = (int) Math.ceil(pct / 100.0 * sorted.size()) - 1;
        return sorted.get(Math.max(0, Math.min(idx, sorted.size() - 1)));
    }
}
