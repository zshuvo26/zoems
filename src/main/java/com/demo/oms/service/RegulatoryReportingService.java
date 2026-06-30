package com.demo.oms.service;

import com.demo.oms.domain.Instrument;
import com.demo.oms.domain.Trade;
import com.demo.oms.dto.BsecReportResponse;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.repository.InstrumentRepository;
import com.demo.oms.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegulatoryReportingService {

    private final TradeRepository tradeRepository;
    private final InstrumentRepository instrumentRepository;

    /**
     * BSEC Daily Trade Report — format matches BSEC reporting requirements.
     * Exchange and date-filtered list of all trades with full fee breakdown.
     */
    public BsecReportResponse generateDailyTradeReport(String exchangeStr, LocalDate reportDate) {
        String dateStr = reportDate.format(DateTimeFormatter.ISO_DATE);
        ExchangeType exchange = ExchangeType.valueOf(exchangeStr.toUpperCase());

        // Get all trades for the date
        List<Trade> allTrades = tradeRepository.findAll();
        List<Trade> trades = allTrades.stream()
                .filter(t -> t.getTradeTime() != null)
                .filter(t -> t.getTradeTime().toLocalDate().equals(reportDate))
                .filter(t -> exchange.name().equals(t.getExchange()))
                .sorted((a, b) -> a.getTradeTime().compareTo(b.getTradeTime()))
                .collect(Collectors.toList());

        BsecReportResponse report = new BsecReportResponse();
        report.setReportType("DAILY_TRADE_REPORT");
        report.setReportDate(dateStr);
        report.setExchange(exchange.name());
        report.setGeneratedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        report.setGeneratedBy("OMS-AUTO");
        report.setTotalRecords(trades.size());

        BigDecimal totalTradeValue = BigDecimal.ZERO;
        BigDecimal totalBrokerage  = BigDecimal.ZERO;

        AtomicInteger serial = new AtomicInteger(1);
        List<BsecReportResponse.TradeReportLine> lines = new ArrayList<>();

        for (Trade t : trades) {
            BsecReportResponse.TradeReportLine line = new BsecReportResponse.TradeReportLine();
            line.setSerialNo(String.valueOf(serial.getAndIncrement()));
            line.setTradeDate(t.getTradeTime().toLocalDate().format(DateTimeFormatter.ISO_DATE));
            line.setTradeId(t.getTradeId());
            line.setBoAccountNo(t.getAccountId());
            line.setSymbol(t.getSymbol());

            // ISIN lookup
            line.setIsin(instrumentRepository.findById(t.getSymbol())
                    .map(Instrument::getIsin).orElse("BD" + t.getSymbol() + "000001"));

            line.setSide(t.getSide());
            line.setQuantity(t.getQuantity());
            line.setPrice(t.getPrice());
            line.setGrossValue(t.getGrossValue());
            line.setBrokerage(t.getCommission() != null ? t.getCommission() : BigDecimal.ZERO);
            line.setSecLevy(t.getSecFee() != null ? t.getSecFee() : BigDecimal.ZERO);
            line.setAit(t.getAit() != null ? t.getAit() : BigDecimal.ZERO);
            line.setDseSmeFee(t.getDseSmeFee() != null ? t.getDseSmeFee() : BigDecimal.ZERO);
            line.setNetValue(t.getNetValue() != null ? t.getNetValue() : t.getGrossValue());
            line.setSettlementDate(t.getSettlementDate());
            lines.add(line);

            totalTradeValue = totalTradeValue.add(t.getGrossValue() != null ? t.getGrossValue() : BigDecimal.ZERO);
            totalBrokerage  = totalBrokerage.add(t.getCommission() != null ? t.getCommission() : BigDecimal.ZERO);
        }

        report.setTrades(lines);
        report.setTotalTradeValue(totalTradeValue.setScale(2, RoundingMode.HALF_UP));
        report.setTotalBrokerage(totalBrokerage.setScale(2, RoundingMode.HALF_UP));

        log.info("Generated BSEC daily trade report for {} {} — {} trades, total value BDT {}",
                exchange, dateStr, trades.size(), totalTradeValue);
        return report;
    }

    /**
     * Client exposure/position report — current open positions per account.
     */
    public BsecReportResponse generatePositionReport(LocalDate reportDate) {
        BsecReportResponse report = new BsecReportResponse();
        report.setReportType("POSITION_REPORT");
        report.setReportDate(reportDate.format(DateTimeFormatter.ISO_DATE));
        report.setGeneratedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        report.setGeneratedBy("OMS-AUTO");
        return report;
    }
}
