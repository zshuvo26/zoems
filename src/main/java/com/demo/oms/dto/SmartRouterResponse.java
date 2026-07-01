package com.demo.oms.dto;

import lombok.Data;

import java.util.List;

@Data
public class SmartRouterResponse {

    @Data
    public static class VenueScore {
        private String venue;
        private double score;
        private double liquidityScore;
        private double feeScore;
        private double latencyScore;
        private String rationale;
    }

    private String selectedVenue;
    private double selectedScore;
    private String primaryReason;
    private List<VenueScore> allVenueScores;
    private String symbol;
    private String side;
    private double quantity;
}
