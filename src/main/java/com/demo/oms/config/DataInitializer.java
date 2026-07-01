package com.demo.oms.config;

import com.demo.oms.domain.*;
import com.demo.oms.enums.*;
import com.demo.oms.repository.*;
import com.demo.oms.service.InstrumentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Slf4j
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private InstrumentRepository instrumentRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private RiskLimitRepository riskLimitRepository;
    @Autowired private OmsUserRepository omsUserRepository;
    @Autowired private ComplianceRuleRepository complianceRuleRepository;
    @Autowired private IpoListingRepository ipoListingRepository;
    @Autowired private InstrumentService instrumentService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private com.demo.oms.repository.HolidayCalendarRepository holidayCalendarRepository;

    @Override
    public void run(String... args) {
        seedDseInstruments();
        seedCseInstruments();
        backfillFundamentals();
        seedDemoAccounts();
        seedOmsUsers();
        seedComplianceRules();
        seedIpoListings();
        seedHolidays();
        log.info("Data initialization complete — {} instruments, {} users, {} compliance rules loaded",
                instrumentRepository.count(), omsUserRepository.count(), complianceRuleRepository.count());
    }

    private void seedHolidays() {
        if (holidayCalendarRepository.count() > 0) return;
        Object[][] holidays = {
            // 2025
            {2025, 2, 21, "International Mother Language Day", "PUBLIC"},
            {2025, 3, 26, "Independence Day", "PUBLIC"},
            {2025, 4, 14, "Bengali New Year (Pohela Boishakh)", "PUBLIC"},
            {2025, 5, 1,  "May Day (International Labour Day)", "PUBLIC"},
            {2025, 3, 30, "Eid ul-Fitr Day 1", "RELIGIOUS"},
            {2025, 3, 31, "Eid ul-Fitr Day 2", "RELIGIOUS"},
            {2025, 4, 1,  "Eid ul-Fitr Day 3", "RELIGIOUS"},
            {2025, 6, 6,  "Eid ul-Adha Day 1", "RELIGIOUS"},
            {2025, 6, 7,  "Eid ul-Adha Day 2", "RELIGIOUS"},
            {2025, 6, 8,  "Eid ul-Adha Day 3", "RELIGIOUS"},
            {2025, 8, 15, "National Mourning Day (Sheikh Mujibur Rahman)", "PUBLIC"},
            {2025, 12, 16, "Victory Day", "PUBLIC"},
            // 2026
            {2026, 2, 21, "International Mother Language Day", "PUBLIC"},
            {2026, 3, 26, "Independence Day", "PUBLIC"},
            {2026, 4, 14, "Bengali New Year (Pohela Boishakh)", "PUBLIC"},
            {2026, 5, 1,  "May Day (International Labour Day)", "PUBLIC"},
            {2026, 8, 15, "National Mourning Day", "PUBLIC"},
            {2026, 12, 16, "Victory Day", "PUBLIC"},
        };
        for (Object[] h : holidays) {
            com.demo.oms.domain.HolidayCalendar hc = new com.demo.oms.domain.HolidayCalendar();
            hc.setDate(LocalDate.of((int)h[0], (int)h[1], (int)h[2]));
            hc.setName((String)h[3]);
            hc.setType((String)h[4]);
            hc.setExchange("ALL");
            hc.setActive(true);
            holidayCalendarRepository.save(hc);
        }
        log.info("Holiday calendar seeded with {} entries", holidayCalendarRepository.count());
    }

    private void backfillFundamentals() {
        instrumentRepository.findAll().forEach(inst -> {
            if (inst.getPeRatio() == null && inst.getPreviousClose() != null) {
                populateFundamentals(inst, inst.getPreviousClose(), inst.getSector());
                instrumentRepository.save(inst);
            }
        });
    }

    private void seedDseInstruments() {
        // symbol, name, sector, board, prevClose, lotSize, PE, EPS, 52wHigh, 52wLow, divYield%, listedSharesMln
        Object[][] dseStocks = {
            {"GP",         "Grameenphone Ltd",                     "Telecommunication", "A", 309.00, 1,  14.5, 21.31, 352.00, 267.00, 6.8,  1350},
            {"SQURPHARMA", "Square Pharmaceuticals PLC",           "Pharmaceuticals",   "A", 240.00, 1,  19.2, 12.50, 278.00, 198.00, 3.5,  750},
            {"BERGERPBL",  "Berger Paints Bangladesh Ltd",         "Chemical",          "A",1850.00, 1,  32.0, 57.81,2090.00,1620.00, 2.1,  76},
            {"BRACBANK",   "BRAC Bank PLC",                        "Banks",             "A",  44.50,10,   8.9,  5.00,  52.30,  37.40, 5.6,  1510},
            {"DUTCHBANGLA","Dutch-Bangla Bank PLC",                "Banks",             "A",  89.30,10,   9.2,  9.71,  98.50,  74.20, 6.7,  300},
            {"ISLAMIBANK", "Islami Bank Bangladesh PLC",           "Banks",             "A",  29.80,10,   7.5,  3.97,  35.10,  24.60, 5.3,  1600},
            {"PUBALIBANK", "Pubali Bank Ltd",                      "Banks",             "A",  25.70,10,   7.1,  3.62,  30.40,  21.50, 6.0,  980},
            {"EASTLBANK",  "Eastern Bank PLC",                     "Banks",             "A",  28.40,10,   8.3,  3.42,  33.60,  23.10, 5.8,  760},
            {"CITYBANK",   "The City Bank Ltd",                    "Banks",             "A",  31.20,10,   8.7,  3.59,  36.80,  25.90, 5.4,  820},
            {"PREMIERBANK","Premier Bank PLC",                     "Banks",             "A",  12.10,10,   6.2,  1.95,  14.80,  9.70,  6.6,  1050},
            {"LHBL",       "LafargeHolcim Bangladesh Ltd",         "Cement",            "A",  74.20,10,  12.4,  5.98,  86.50,  62.00, 4.0,  560},
            {"HEIDELBCEM", "HeidelbergCement Bangladesh Ltd",      "Cement",            "A", 342.00, 1,  15.8, 21.65, 398.00, 290.00, 3.5,  118},
            {"MEGHNACEM",  "Meghna Cement Mills Ltd",              "Cement",            "A", 118.50, 1,  11.2, 10.58, 138.00,  98.00, 3.8,  200},
            {"TITASGAS",   "Titas Gas Transmission & Dist. Co",    "Fuel & Power",      "A",  42.10,10,   9.5,  4.43,  50.20,  35.60, 5.9,  1100},
            {"DESCO",      "Dhaka Electric Supply Co Ltd",         "Fuel & Power",      "A",  58.60,10,  11.3,  5.18,  68.90,  48.20, 5.1,  420},
            {"DPDC",       "Dhaka Power Distribution Co Ltd",      "Fuel & Power",      "A",  35.40,10,  10.2,  3.47,  41.80,  29.50, 5.6,  350},
            {"RENATA",     "Renata PLC",                           "Pharmaceuticals",   "A",1095.00, 1,  22.8, 48.03,1280.00, 920.00, 2.0,  92},
            {"BEXIMCO",    "Beximco Pharmaceuticals Ltd",          "Pharmaceuticals",   "A", 115.20,10,  16.7,  6.90, 138.00,  94.00, 1.8,  850},
            {"ACMELAB",    "ACME Laboratories Ltd",                "Pharmaceuticals",   "A",  68.90,10,  14.2,  4.85,  82.00,  55.00, 2.9,  180},
            {"IBNSINA",    "Ibn Sina Pharmaceutical Industry Ltd", "Pharmaceuticals",   "A", 258.30, 1,  18.5, 13.96, 305.00, 210.00, 2.7,  110},
            {"ORIONPHARMA","Orion Pharma Ltd",                     "Pharmaceuticals",   "A",  64.50,10,  13.1,  4.92,  76.00,  52.00, 3.1,  270},
            {"MARICO",     "Marico Bangladesh Ltd",                "Food & Allied",     "A",2325.00, 1,  38.5, 60.39,2680.00,1950.00, 1.3,  90},
            {"BATBC",      "British American Tobacco Bangladesh",   "Food & Allied",     "A", 475.00, 1,  16.8, 28.27, 560.00, 390.00, 7.4,  300},
            {"OLYMPICIND", "Olympic Industries Ltd",               "Food & Allied",     "A", 182.60, 1,  21.3,  8.57, 215.00, 152.00, 2.7,  150},
            {"GOLDENBEE",  "Golden Bee Foods Ltd",                 "Food & Allied",     "A",  43.70,10,   9.4,  4.65,  51.00,  35.00, 4.6,  220},
            {"MLDYEING",   "M.L. Dyeing Ltd",                      "Textile",           "A",  18.90,10,   6.8,  2.78,  23.50,  15.20, 3.2,  320},
            {"SQUARETEX",  "Square Textiles Ltd",                  "Textile",           "A",  56.80,10,  10.5,  5.41,  67.00,  46.00, 3.5,  430},
            {"MAKSONSPIN", "Maksons Spinning Mills Ltd",           "Textile",           "B",  11.50,10,   5.2,  2.21,  14.80,   8.90, 2.6,  280},
            {"ENVOYTEXT",  "Envoy Textiles Ltd",                   "Textile",           "A",  88.40,10,  12.8,  6.91, 104.00,  72.00, 3.4,  200},
            {"DBL",        "DBL Ceramics Ltd",                     "Ceramic",           "A",  55.20,10,   9.8,  5.63,  64.50,  44.00, 4.0,  180},
            {"RAHIMTEXT",  "Rahim Textile Mills Ltd",              "Textile",           "B",  38.10,10,   8.4,  4.54,  45.00,  30.00, 3.9,  150},
            {"AAMRANET",   "Aamra Networks Ltd",                   "IT",                "N",  67.40,10,  22.5,  2.99,  81.00,  52.00, 1.5,  120},
            {"BDCOM",      "BDCOM Online Ltd",                     "IT",                "A",  49.80,10,  19.1,  2.61,  59.00,  39.00, 2.0,  100},
            {"SSLWIRELESS","SSL Wireless Ltd",                     "IT",                "N",  34.60,10,  16.4,  2.11,  41.00,  27.00, 1.7,  90},
            {"IFADAUTOS",  "Ifad Autos Ltd",                       "Engineering",       "A",  57.90,10,  11.2,  5.17,  68.00,  46.00, 3.5,  200},
            {"BAYLEASING", "Bay Leasing & Investment Ltd",         "Non-Bank FI",       "A",  23.50,10,   7.6,  3.09,  28.00,  19.00, 5.1,  310},
            {"DELTALIFE",  "Delta Life Insurance Co Ltd",          "Insurance",         "A", 112.00, 1,  13.8,  8.12, 132.00,  90.00, 4.5,  95},
            {"JMISMDL",    "JMI Syringes & Medical Devices Ltd",  "Pharmaceuticals",   "A",  88.30,10,  17.6,  5.02, 105.00,  71.00, 2.3,  130},
            {"SINGER",     "Singer Bangladesh Ltd",                "Engineering",       "A", 162.40, 1,  14.5, 11.20, 192.00, 134.00, 3.8,  120},
            {"WALTONHIL",  "Walton Hi-Tech Industries PLC",        "Engineering",       "A",1375.00, 1,  20.8, 66.11,1580.00,1120.00, 1.6,  330},
        };

        for (Object[] s : dseStocks) {
            if (!instrumentRepository.existsById((String) s[0])) {
                Instrument inst = buildInstrument(
                    (String) s[0], (String) s[1], (String) s[2], (String) s[3],
                    BigDecimal.valueOf((Double) s[4]),
                    BigDecimal.valueOf((Integer) s[5]),
                    ExchangeType.DSE,
                    BigDecimal.valueOf((Double) s[6]),
                    BigDecimal.valueOf((Double) s[7]),
                    BigDecimal.valueOf((Double) s[8]),
                    BigDecimal.valueOf((Double) s[9]),
                    BigDecimal.valueOf((Double) s[10]),
                    BigDecimal.valueOf((Integer) s[11])
                );
                instrumentRepository.save(inst);
            }
        }
        // compute circuit limits for all DSE instruments
        instrumentRepository.findByExchange(ExchangeType.DSE)
                .forEach(inst -> { try { instrumentService.updateCircuitLimits(inst.getSymbol()); } catch (Exception ignored) {} });
    }

    private void seedCseInstruments() {
        Object[][] cseStocks = {
            {"GP-CSE",        "Grameenphone Ltd",               "Telecommunication", "A", 309.00, 1},
            {"SQURPHARMA-CSE","Square Pharmaceuticals PLC",      "Pharmaceuticals",   "A", 240.00, 1},
            {"BRACBANK-CSE",  "BRAC Bank PLC",                   "Banks",             "A", 44.50, 10},
            {"MEGHNACEM-CSE", "Meghna Cement Mills Ltd",         "Cement",            "A", 118.50, 1},
            {"RENATA-CSE",    "Renata PLC",                      "Pharmaceuticals",   "A", 1095.00, 1},
        };

        for (Object[] s : cseStocks) {
            if (!instrumentRepository.existsById((String) s[0])) {
                Instrument inst = buildInstrument(
                    (String) s[0], (String) s[1], (String) s[2], (String) s[3],
                    BigDecimal.valueOf((Double) s[4]),
                    BigDecimal.valueOf((Integer) s[5]),
                    ExchangeType.CSE
                );
                instrumentRepository.save(inst);
            }
        }
    }

    private Instrument buildInstrument(String symbol, String name, String sector, String board,
                                        BigDecimal prevClose, BigDecimal lotSize, ExchangeType exchange,
                                        BigDecimal pe, BigDecimal eps, BigDecimal w52h, BigDecimal w52l,
                                        BigDecimal divYield, BigDecimal listedSharesMln) {
        Instrument inst = buildInstrument(symbol, name, sector, board, prevClose, lotSize, exchange);
        inst.setPeRatio(pe);
        inst.setEps(eps);
        inst.setWeekHigh52(w52h);
        inst.setWeekLow52(w52l);
        inst.setDividendYield(divYield);
        BigDecimal listed = listedSharesMln.multiply(BigDecimal.valueOf(1_000_000));
        inst.setListedShares(listed);
        inst.setMarketCap(prevClose.multiply(listed).divide(BigDecimal.valueOf(10_000_000), 2, RoundingMode.HALF_UP));
        inst.setBookValue(prevClose.multiply(new BigDecimal("0.82")).setScale(2, RoundingMode.HALF_UP));
        return inst;
    }

    private Instrument buildInstrument(String symbol, String name, String sector, String board,
                                        BigDecimal prevClose, BigDecimal lotSize, ExchangeType exchange) {
        Instrument inst = new Instrument();
        inst.setSymbol(symbol);
        inst.setName(name);
        inst.setShortName(symbol);
        inst.setSector(sector);
        inst.setBoard(board);
        inst.setExchange(exchange);
        inst.setLotSize(lotSize);
        inst.setTickSize(new BigDecimal("0.10"));
        inst.setPreviousClose(prevClose);
        inst.setLastPrice(prevClose);
        inst.setFaceValue(new BigDecimal("10.00"));
        inst.setTradeable(true);
        inst.setHalted(false);
        inst.setCircuitBreakerUpperPct(new BigDecimal("10.00"));
        inst.setCircuitBreakerLowerPct(new BigDecimal("10.00"));
        inst.setBidPrice(prevClose.multiply(new BigDecimal("0.999")).setScale(2, RoundingMode.HALF_UP));
        inst.setAskPrice(prevClose.multiply(new BigDecimal("1.001")).setScale(2, RoundingMode.HALF_UP));
        inst.setVolume(BigDecimal.ZERO);
        inst.setTradedValue(BigDecimal.ZERO);
        populateFundamentals(inst, prevClose, sector);
        return inst;
    }

    private void populateFundamentals(Instrument inst, BigDecimal prevClose, String sector) {
        BigDecimal pe = getSectorPE(sector);
        BigDecimal dy = getSectorDY(sector);
        BigDecimal eps = prevClose.divide(pe, 2, RoundingMode.HALF_UP);
        BigDecimal bv  = prevClose.multiply(new BigDecimal("0.82")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal listed = BigDecimal.valueOf(50_000_000L)
            .multiply(new BigDecimal("100").divide(prevClose, 0, RoundingMode.HALF_UP).max(BigDecimal.ONE));
        BigDecimal mcap = prevClose.multiply(listed).divide(BigDecimal.valueOf(10_000_000), 2, RoundingMode.HALF_UP);

        inst.setPeRatio(pe);
        inst.setEps(eps);
        inst.setDividendYield(dy);
        inst.setBookValue(bv);
        inst.setListedShares(listed);
        inst.setMarketCap(mcap);
        inst.setWeekHigh52(prevClose.multiply(new BigDecimal("1.22")).setScale(2, RoundingMode.HALF_UP));
        inst.setWeekLow52(prevClose.multiply(new BigDecimal("0.76")).setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal getSectorPE(String sector) {
        if (sector == null) return new BigDecimal("14.0");
        return switch (sector) {
            case "Banks"           -> new BigDecimal("10.5");
            case "Pharmaceuticals" -> new BigDecimal("18.0");
            case "Telecommunication" -> new BigDecimal("15.0");
            case "Food & Allied"   -> new BigDecimal("22.0");
            case "Cement"          -> new BigDecimal("16.0");
            case "Fuel & Power"    -> new BigDecimal("13.5");
            case "Non-Bank FI"     -> new BigDecimal("11.0");
            case "Insurance"       -> new BigDecimal("12.0");
            case "IT"              -> new BigDecimal("20.0");
            case "Engineering"     -> new BigDecimal("15.5");
            case "Textile"         -> new BigDecimal("12.0");
            case "Chemical"        -> new BigDecimal("17.0");
            default                -> new BigDecimal("14.0");
        };
    }

    private BigDecimal getSectorDY(String sector) {
        if (sector == null) return new BigDecimal("2.5");
        return switch (sector) {
            case "Banks"           -> new BigDecimal("4.2");
            case "Pharmaceuticals" -> new BigDecimal("2.8");
            case "Telecommunication" -> new BigDecimal("5.5");
            case "Food & Allied"   -> new BigDecimal("3.0");
            case "Cement"          -> new BigDecimal("2.2");
            case "Fuel & Power"    -> new BigDecimal("6.0");
            case "Non-Bank FI"     -> new BigDecimal("3.5");
            case "Insurance"       -> new BigDecimal("4.0");
            case "IT"              -> new BigDecimal("1.5");
            case "Engineering"     -> new BigDecimal("2.8");
            case "Textile"         -> new BigDecimal("3.0");
            default                -> new BigDecimal("2.5");
        };
    }

    private void seedDemoAccounts() {
        if (accountRepository.count() == 0) {
            // Demo account 1: Individual investor
            Account acc1 = new Account();
            acc1.setId("1201880012345678");
            acc1.setName("Rahul Ahmed");
            acc1.setEmail("rahul.ahmed@demo.bd");
            acc1.setPhone("+8801712345678");
            acc1.setAccountType("INDIVIDUAL");
            acc1.setBrokerId("BRK-001");
            acc1.setBrokerName("EBL Securities Ltd");
            acc1.setTraderId("TRD-001");
            acc1.setCashBalance(new BigDecimal("500000.00")); // BDT 5 lakh
            acc1.setAvailableFunds(new BigDecimal("500000.00"));
            accountRepository.save(acc1);

            RiskLimit rl1 = new RiskLimit();
            rl1.setAccountId(acc1.getId());
            rl1.setMaxOrderValue(new BigDecimal("200000"));
            rl1.setMaxPositionValue(new BigDecimal("2000000"));
            riskLimitRepository.save(rl1);

            // Demo account 2: Institutional investor
            Account acc2 = new Account();
            acc2.setId("1201880087654321");
            acc2.setName("Dhaka Capital Management Ltd");
            acc2.setEmail("trading@dhakacapital.com.bd");
            acc2.setPhone("+88029876543");
            acc2.setAccountType("CORPORATE");
            acc2.setBrokerId("BRK-001");
            acc2.setBrokerName("EBL Securities Ltd");
            acc2.setTraderId("TRD-002");
            acc2.setCashBalance(new BigDecimal("50000000.00")); // BDT 5 crore
            acc2.setAvailableFunds(new BigDecimal("50000000.00"));
            accountRepository.save(acc2);

            RiskLimit rl2 = new RiskLimit();
            rl2.setAccountId(acc2.getId());
            rl2.setMaxOrderValue(new BigDecimal("5000000"));
            rl2.setMaxPositionValue(new BigDecimal("50000000"));
            rl2.setMaxOrdersPerDay(500);
            riskLimitRepository.save(rl2);

            log.info("Seeded 2 demo BO accounts");
        }
    }

    private void seedOmsUsers() {
        if (omsUserRepository.count() == 0) {
            // ADMIN — full system access
            OmsUser admin = new OmsUser();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(UserRole.ADMIN);
            admin.setFullName("System Administrator");
            admin.setEmail("admin@oms.bd");
            omsUserRepository.save(admin);

            // DEALER — can trade for any account
            OmsUser dealer = new OmsUser();
            dealer.setUsername("dealer");
            dealer.setPassword(passwordEncoder.encode("dealer123"));
            dealer.setRole(UserRole.DEALER);
            dealer.setFullName("Senior Dealer");
            dealer.setEmail("dealer@oms.bd");
            dealer.setAccountId("1201880087654321");
            omsUserRepository.save(dealer);

            // TRADER — can trade own account only
            OmsUser trader = new OmsUser();
            trader.setUsername("trader");
            trader.setPassword(passwordEncoder.encode("trader123"));
            trader.setRole(UserRole.TRADER);
            trader.setFullName("Retail Trader");
            trader.setEmail("trader@oms.bd");
            trader.setAccountId("1201880012345678");
            omsUserRepository.save(trader);

            // VIEWER — read-only
            OmsUser viewer = new OmsUser();
            viewer.setUsername("viewer");
            viewer.setPassword(passwordEncoder.encode("viewer123"));
            viewer.setRole(UserRole.VIEWER);
            viewer.setFullName("Compliance Viewer");
            viewer.setEmail("viewer@oms.bd");
            omsUserRepository.save(viewer);

            log.info("Seeded 4 OMS users: admin/dealer/trader/viewer");
        }
    }

    private void seedComplianceRules() {
        if (complianceRuleRepository.count() == 0) {
            // Wash trade: block same symbol opposite-side order within 30 minutes
            ComplianceRule washTrade = new ComplianceRule();
            washTrade.setRuleType(ComplianceRuleType.WASH_TRADE_WINDOW);
            washTrade.setScope("GLOBAL");
            washTrade.setRuleValue("30");
            washTrade.setDescription("Block potential wash trades — same symbol opposite side within 30 minutes");
            washTrade.setEffectiveFrom(LocalDate.now().minusDays(1));
            complianceRuleRepository.save(washTrade);

            // Duplicate order: block identical order within 30 seconds
            ComplianceRule dupOrder = new ComplianceRule();
            dupOrder.setRuleType(ComplianceRuleType.DUPLICATE_ORDER_WINDOW);
            dupOrder.setScope("GLOBAL");
            dupOrder.setRuleValue("30");
            dupOrder.setDescription("Prevent duplicate orders — identical symbol/side/qty/price within 30 seconds");
            dupOrder.setEffectiveFrom(LocalDate.now().minusDays(1));
            complianceRuleRepository.save(dupOrder);

            log.info("Seeded 2 compliance rules (wash trade + duplicate order detection)");
        }
    }

    private void seedIpoListings() {
        if (ipoListingRepository.count() == 0) {
            // Sample IPO 1: Open for subscription
            IpoListing ipo1 = new IpoListing();
            ipo1.setIpoId("NEWCO-PHARMA-2026-IPO");
            ipo1.setSymbol("NEWCOPHARMA");
            ipo1.setCompanyName("Newco Pharmaceuticals Ltd");
            ipo1.setSector("Pharmaceuticals");
            ipo1.setIssuePrice(new BigDecimal("30.00"));
            ipo1.setFaceValue(new BigDecimal("10.00"));
            ipo1.setLotSize(100);
            ipo1.setMinLots(1);
            ipo1.setMaxLots(20);
            ipo1.setTotalSharesOnOffer(10_000_000L);
            ipo1.setSubscriptionOpen(LocalDate.now().minusDays(1));
            ipo1.setSubscriptionClose(LocalDate.now().plusDays(5));
            ipo1.setAllotmentDate(LocalDate.now().plusDays(14));
            ipo1.setListingDate(LocalDate.now().plusDays(21));
            ipo1.setStatus("OPEN");
            ipoListingRepository.save(ipo1);

            // Sample IPO 2: Recently closed (allotment pending)
            IpoListing ipo2 = new IpoListing();
            ipo2.setIpoId("TECHBD-2026-IPO");
            ipo2.setSymbol("TECHBD");
            ipo2.setCompanyName("TechBD Solutions Ltd");
            ipo2.setSector("IT");
            ipo2.setIssuePrice(new BigDecimal("50.00"));
            ipo2.setFaceValue(new BigDecimal("10.00"));
            ipo2.setLotSize(100);
            ipo2.setMinLots(1);
            ipo2.setMaxLots(10);
            ipo2.setTotalSharesOnOffer(5_000_000L);
            ipo2.setSubscriptionOpen(LocalDate.now().minusDays(10));
            ipo2.setSubscriptionClose(LocalDate.now().minusDays(3));
            ipo2.setAllotmentDate(LocalDate.now().plusDays(5));
            ipo2.setListingDate(LocalDate.now().plusDays(12));
            ipo2.setStatus("CLOSED");
            ipoListingRepository.save(ipo2);

            log.info("Seeded 2 IPO listings");
        }
    }
}
