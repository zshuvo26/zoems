package com.demo.oms.service;

import com.demo.oms.domain.Position;
import com.demo.oms.dto.PerformanceResponse;
import com.demo.oms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final AccountRepository accountRepository;
    private final PositionRepository positionRepository;
    private final TradeRepository tradeRepository;
    private final InstrumentRepository instrumentRepository;

    // Approximate DSEX benchmark returns by period (static reference — replace with live data feed)
    private static final Map<String, BigDecimal> DSEX_RETURNS = Map.of(
            "1D",  new BigDecimal("0.12"),
            "1W",  new BigDecimal("0.45"),
            "1M",  new BigDecimal("1.20"),
            "3M",  new BigDecimal("3.50"),
            "YTD", new BigDecimal("8.20"),
            "1Y",  new BigDecimal("12.50")
    );

    public PerformanceResponse getPerformance(String accountId, String period) {
        var account = accountRepository.findById(accountId)
                .orElseThrow(() -> new com.demo.oms.exception.OmsException("NOT_FOUND", "Account not found: " + accountId));

        List<Position> positions = positionRepository.findActivePositionsByAccount(accountId);

        PerformanceResponse resp = new PerformanceResponse();
        resp.setAccountId(accountId);
        resp.setPeriod(period);
        resp.setAsOf(LocalDate.now().format(DateTimeFormatter.ISO_DATE));

        // Aggregate P&L
        BigDecimal totalUnrealized = positions.stream()
                .map(p -> p.getUnrealizedPnL() != null ? p.getUnrealizedPnL() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRealized = positions.stream()
                .map(p -> p.getRealizedPnL() != null ? p.getRealizedPnL() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPnL = totalRealized.add(totalUnrealized);

        resp.setUnrealizedPnL(totalUnrealized.setScale(2, RoundingMode.HALF_UP));
        resp.setRealizedPnL(totalRealized.setScale(2, RoundingMode.HALF_UP));
        resp.setTotalPnL(totalPnL.setScale(2, RoundingMode.HALF_UP));

        BigDecimal portfolioValue = account.getPortfolioValue() != null ? account.getPortfolioValue() : BigDecimal.ZERO;
        BigDecimal totalCostBasis = positions.stream()
                .map(p -> p.getCostBasis() != null ? p.getCostBasis() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Portfolio return: pnl / cost × 100
        BigDecimal portfolioReturn = totalCostBasis.compareTo(BigDecimal.ZERO) > 0
                ? totalPnL.divide(totalCostBasis, 6, RoundingMode.HALF_UP)
                          .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal benchmarkReturn = DSEX_RETURNS.getOrDefault(period, BigDecimal.ZERO);

        resp.setPortfolioReturnPct(portfolioReturn);
        resp.setBenchmarkReturnPct(benchmarkReturn);
        resp.setAlphaPct(portfolioReturn.subtract(benchmarkReturn).setScale(2, RoundingMode.HALF_UP));

        resp.setPortfolioValue(portfolioValue.setScale(2, RoundingMode.HALF_UP));
        resp.setCashBalance(account.getCashBalance().setScale(2, RoundingMode.HALF_UP));
        resp.setTotalEquity(account.getTotalEquity() != null
                ? account.getTotalEquity().setScale(2, RoundingMode.HALF_UP)
                : portfolioValue.add(account.getCashBalance()).setScale(2, RoundingMode.HALF_UP));

        // Sector breakdown
        Map<String, List<Position>> bySector = positions.stream()
                .collect(Collectors.groupingBy(p -> {
                    return instrumentRepository.findById(p.getSymbol())
                            .map(i -> i.getSector() != null ? i.getSector() : "Unknown")
                            .orElse("Unknown");
                }));

        List<PerformanceResponse.SectorAllocation> sectorList = new ArrayList<>();
        bySector.forEach((sector, posList) -> {
            PerformanceResponse.SectorAllocation sa = new PerformanceResponse.SectorAllocation();
            sa.setSector(sector);
            BigDecimal mv = posList.stream()
                    .map(p -> p.getMarketValue() != null ? p.getMarketValue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal pnl = posList.stream()
                    .map(p -> p.getUnrealizedPnL() != null ? p.getUnrealizedPnL() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            sa.setMarketValue(mv.setScale(2, RoundingMode.HALF_UP));
            sa.setSectorPnL(pnl.setScale(2, RoundingMode.HALF_UP));
            sa.setWeightPct(portfolioValue.compareTo(BigDecimal.ZERO) > 0
                    ? mv.divide(portfolioValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
            BigDecimal cost = posList.stream()
                    .map(p -> p.getCostBasis() != null ? p.getCostBasis() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            sa.setSectorReturnPct(cost.compareTo(BigDecimal.ZERO) > 0
                    ? pnl.divide(cost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
            sectorList.add(sa);
        });
        sectorList.sort(Comparator.comparing(PerformanceResponse.SectorAllocation::getMarketValue).reversed());
        resp.setSectorBreakdown(sectorList);

        // Position-level performance
        List<PerformanceResponse.PositionPerformance> posPerf = positions.stream()
                .filter(p -> p.getNetQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(p -> {
                    PerformanceResponse.PositionPerformance pp = new PerformanceResponse.PositionPerformance();
                    pp.setSymbol(p.getSymbol());
                    pp.setQuantity(p.getNetQuantity());
                    pp.setAvgCost(p.getAvgCostPrice());
                    pp.setCurrentPrice(p.getCurrentMarketPrice());
                    BigDecimal pnl = p.getUnrealizedPnL() != null ? p.getUnrealizedPnL() : BigDecimal.ZERO;
                    pp.setUnrealizedPnL(pnl.setScale(2, RoundingMode.HALF_UP));
                    BigDecimal cost = p.getCostBasis() != null ? p.getCostBasis() : BigDecimal.ZERO;
                    pp.setReturnPct(cost.compareTo(BigDecimal.ZERO) > 0
                            ? pnl.divide(cost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO);
                    BigDecimal mv = p.getMarketValue() != null ? p.getMarketValue() : BigDecimal.ZERO;
                    pp.setPortfolioWeightPct(portfolioValue.compareTo(BigDecimal.ZERO) > 0
                            ? mv.divide(portfolioValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO);
                    return pp;
                })
                .collect(Collectors.toList());

        // Top 5 contributors (by unrealized P&L)
        resp.setTopContributors(posPerf.stream()
                .sorted(Comparator.comparing(PerformanceResponse.PositionPerformance::getUnrealizedPnL).reversed())
                .limit(5).collect(Collectors.toList()));

        // Bottom 5 (worst performers)
        resp.setBottomContributors(posPerf.stream()
                .sorted(Comparator.comparing(PerformanceResponse.PositionPerformance::getUnrealizedPnL))
                .limit(5).collect(Collectors.toList()));

        return resp;
    }
}
