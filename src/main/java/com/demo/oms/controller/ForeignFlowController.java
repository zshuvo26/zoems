package com.demo.oms.controller;

import com.demo.oms.domain.Trade;
import com.demo.oms.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/foreign-flow")
@RequiredArgsConstructor
public class ForeignFlowController {

    private final TradeRepository tradeRepo;

    // DSE FDR — simulated foreign buy/sell (in a real deployment this comes from DSE data feed)
    @GetMapping
    public Map<String, Object> foreignFlow(
            @RequestParam(defaultValue = "DSE") String exchange,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate target = date != null ? date : LocalDate.now();

        // Derive pseudo-foreign flow from trade volume (seed deterministic from date)
        long seed = target.toEpochDay();
        Random rng = new Random(seed);

        BigDecimal dseMarketTurnover = BigDecimal.valueOf(700 + rng.nextInt(600)).multiply(BigDecimal.valueOf(1_000_000));
        BigDecimal foreignBuy  = dseMarketTurnover.multiply(BigDecimal.valueOf(0.04 + rng.nextDouble() * 0.06));
        BigDecimal foreignSell = dseMarketTurnover.multiply(BigDecimal.valueOf(0.03 + rng.nextDouble() * 0.05));
        BigDecimal netFlow     = foreignBuy.subtract(foreignSell);
        BigDecimal fdr         = foreignBuy.add(foreignSell).multiply(BigDecimal.valueOf(100))
                                           .divide(dseMarketTurnover, 2, java.math.RoundingMode.HALF_UP);

        // Top foreign-bought symbols (simulated sector leaders)
        String[] telecom  = {"GP", "ROBI", "TELETALK"};
        String[] pharma   = {"SQURPHARMA", "RENATA", "BEXIMCO"};
        String[] banking  = {"DUTCHBANGL", "BRACBANK", "EBL"};

        List<Map<String, Object>> topBought = buildFlowList(telecom, pharma, banking, rng, "BUY");
        List<Map<String, Object>> topSold   = buildFlowList(banking, pharma, telecom, rng, "SELL");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exchange",       exchange);
        result.put("date",           target.toString());
        result.put("marketTurnover", dseMarketTurnover.setScale(0, java.math.RoundingMode.HALF_UP));
        result.put("foreignBuy",     foreignBuy.setScale(0, java.math.RoundingMode.HALF_UP));
        result.put("foreignSell",    foreignSell.setScale(0, java.math.RoundingMode.HALF_UP));
        result.put("netFlow",        netFlow.setScale(0, java.math.RoundingMode.HALF_UP));
        result.put("fdr",            fdr);
        result.put("netBuyer",       netFlow.compareTo(BigDecimal.ZERO) > 0);
        result.put("topBought",      topBought);
        result.put("topSold",        topSold);
        return result;
    }

    @GetMapping("/history")
    public List<Map<String, Object>> history(
            @RequestParam(defaultValue = "DSE") String exchange,
            @RequestParam(defaultValue = "30")  int days) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d   = LocalDate.now().minusDays(i);
            long seed     = d.toEpochDay();
            Random rng    = new Random(seed);
            BigDecimal buy  = BigDecimal.valueOf(25 + rng.nextInt(60)).multiply(BigDecimal.valueOf(1_000_000));
            BigDecimal sell = BigDecimal.valueOf(20 + rng.nextInt(50)).multiply(BigDecimal.valueOf(1_000_000));
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", d.toString());
            day.put("foreignBuy",  buy.setScale(0, java.math.RoundingMode.HALF_UP));
            day.put("foreignSell", sell.setScale(0, java.math.RoundingMode.HALF_UP));
            day.put("netFlow",     buy.subtract(sell).setScale(0, java.math.RoundingMode.HALF_UP));
            result.add(day);
        }
        return result;
    }

    private List<Map<String, Object>> buildFlowList(String[] g1, String[] g2, String[] g3, Random rng, String side) {
        List<Map<String, Object>> list = new ArrayList<>();
        String[][] groups = {g1, g2, g3};
        for (String[] grp : groups) {
            String sym = grp[rng.nextInt(grp.length)];
            BigDecimal val = BigDecimal.valueOf(1 + rng.nextInt(20)).multiply(BigDecimal.valueOf(1_000_000));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("symbol", sym);
            item.put("side",   side);
            item.put("value",  val.setScale(0, java.math.RoundingMode.HALF_UP));
            list.add(item);
        }
        return list;
    }
}
