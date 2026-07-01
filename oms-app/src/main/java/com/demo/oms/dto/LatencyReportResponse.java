package com.demo.oms.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class LatencyReportResponse {

    @Data
    public static class ComponentStats {
        private String component;
        private double avgMs;
        private double p50Ms;
        private double p95Ms;
        private double p99Ms;
        private long sampleCount;
        private long alertCount;
        private String status; // GREEN / YELLOW / RED
    }

    @Data
    public static class AlertEntry {
        private String component;
        private long latencyMs;
        private String orderId;
        private LocalDateTime timestamp;
    }

    private LocalDateTime reportGeneratedAt = LocalDateTime.now();
    private String periodHours;
    private Map<String, ComponentStats> componentStats;
    private List<AlertEntry> recentAlerts;
    private long totalSamples;
    private long totalAlerts;
}
