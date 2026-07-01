package com.demo.oms.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pretrade")
@RequiredArgsConstructor
public class PreTradeController {

    // Bangladesh DSE/CSE fee structure (BSEC regulated)
    private static final BigDecimal BROKERAGE_RATE  = new BigDecimal("0.005");   // 0.50%
    private static final BigDecimal SEC_LEVY         = new BigDecimal("0.0005");  // 0.05%
    private static final BigDecimal CDBL_FEE         = new BigDecimal("0.00015"); // 0.015%
    private static final BigDecimal DSE_FEE          = new BigDecimal("0.00005"); // 0.005%
    private static final BigDecimal AIT_SELL         = new BigDecimal("0.001");   // 0.10% on sell (AIT)
    private static final BigDecimal STAMP_BUY        = new BigDecimal("0.00015"); // 0.015% on buy

    @GetMapping("/cost")
    public Map<String, Object> calculate(
            @RequestParam String  side,
            @RequestParam BigDecimal price,
            @RequestParam int     quantity,
            @RequestParam(defaultValue = "DSE") String exchange) {

        BigDecimal tradeValue  = price.multiply(BigDecimal.valueOf(quantity));
        BigDecimal brokerage   = tradeValue.multiply(BROKERAGE_RATE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal secLevy     = tradeValue.multiply(SEC_LEVY).setScale(4, RoundingMode.HALF_UP);
        BigDecimal cdblFee     = tradeValue.multiply(CDBL_FEE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal exchangeFee = tradeValue.multiply(DSE_FEE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal ait         = "SELL".equalsIgnoreCase(side)
                                 ? tradeValue.multiply(AIT_SELL).setScale(4, RoundingMode.HALF_UP)
                                 : BigDecimal.ZERO;
        BigDecimal stamp       = "BUY".equalsIgnoreCase(side)
                                 ? tradeValue.multiply(STAMP_BUY).setScale(4, RoundingMode.HALF_UP)
                                 : BigDecimal.ZERO;

        BigDecimal totalFees = brokerage.add(secLevy).add(cdblFee).add(exchangeFee).add(ait).add(stamp);
        BigDecimal net       = "BUY".equalsIgnoreCase(side)
                               ? tradeValue.add(totalFees)
                               : tradeValue.subtract(totalFees);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("side",        side.toUpperCase());
        result.put("tradeValue",  tradeValue);
        result.put("brokerage",   brokerage);
        result.put("secLevy",     secLevy);
        result.put("cdblFee",     cdblFee);
        result.put("exchangeFee", exchangeFee);
        result.put("ait",         ait);
        result.put("stampDuty",   stamp);
        result.put("totalFees",   totalFees);
        result.put("netAmount",   net);
        result.put("effectivePct", totalFees.multiply(BigDecimal.valueOf(100))
                                            .divide(tradeValue, 4, RoundingMode.HALF_UP));
        return result;
    }
}
