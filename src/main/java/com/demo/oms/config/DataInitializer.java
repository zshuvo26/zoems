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

    @Override
    public void run(String... args) {
        seedDseInstruments();
        seedCseInstruments();
        seedDemoAccounts();
        seedOmsUsers();
        seedComplianceRules();
        seedIpoListings();
        log.info("Data initialization complete — {} instruments, {} users, {} compliance rules loaded",
                instrumentRepository.count(), omsUserRepository.count(), complianceRuleRepository.count());
    }

    private void seedDseInstruments() {
        // DSE Top stocks with realistic prices (BDT)
        Object[][] dseStocks = {
            // symbol, name, sector, board, previousClose, lotSize
            {"GP",         "Grameenphone Ltd",                     "Telecommunication", "A", 309.00, 1},
            {"SQURPHARMA", "Square Pharmaceuticals PLC",           "Pharmaceuticals",   "A", 240.00, 1},
            {"BERGERPBL",  "Berger Paints Bangladesh Ltd",         "Chemical",          "A", 1850.00, 1},
            {"BRACBANK",   "BRAC Bank PLC",                        "Banks",             "A", 44.50, 10},
            {"DUTCHBANGLA","Dutch-Bangla Bank PLC",                "Banks",             "A", 89.30, 10},
            {"ISLAMIBANK", "Islami Bank Bangladesh PLC",           "Banks",             "A", 29.80, 10},
            {"PUBALIBANK", "Pubali Bank Ltd",                      "Banks",             "A", 25.70, 10},
            {"EASTLBANK",  "Eastern Bank PLC",                     "Banks",             "A", 28.40, 10},
            {"CITYBANK",   "The City Bank Ltd",                    "Banks",             "A", 31.20, 10},
            {"PREMIERBANK","Premier Bank PLC",                     "Banks",             "A", 12.10, 10},
            {"LHBL",       "LafargeHolcim Bangladesh Ltd",         "Cement",            "A", 74.20, 10},
            {"HEIDELBCEM", "HeidelbergCement Bangladesh Ltd",      "Cement",            "A", 342.00, 1},
            {"MEGHNACEM",  "Meghna Cement Mills Ltd",              "Cement",            "A", 118.50, 1},
            {"TITASGAS",   "Titas Gas Transmission & Dist. Co",    "Fuel & Power",      "A", 42.10, 10},
            {"DESCO",      "Dhaka Electric Supply Co Ltd",         "Fuel & Power",      "A", 58.60, 10},
            {"DPDC",       "Dhaka Power Distribution Co Ltd",      "Fuel & Power",      "A", 35.40, 10},
            {"RENATA",     "Renata PLC",                           "Pharmaceuticals",   "A", 1095.00, 1},
            {"BEXIMCO",    "Beximco Pharmaceuticals Ltd",          "Pharmaceuticals",   "A", 115.20, 10},
            {"ACMELAB",    "ACME Laboratories Ltd",                "Pharmaceuticals",   "A", 68.90, 10},
            {"IBNSINA",    "Ibn Sina Pharmaceutical Industry Ltd", "Pharmaceuticals",   "A", 258.30, 1},
            {"ORIONPHARMA","Orion Pharma Ltd",                     "Pharmaceuticals",   "A", 64.50, 10},
            {"MARICO",     "Marico Bangladesh Ltd",                "Food & Allied",     "A", 2325.00, 1},
            {"BATBC",      "British American Tobacco Bangladesh",   "Food & Allied",     "A", 475.00, 1},
            {"OLYMPICIND", "Olympic Industries Ltd",               "Food & Allied",     "A", 182.60, 1},
            {"GOLDENBEE",  "Golden Bee Foods Ltd",                 "Food & Allied",     "A", 43.70, 10},
            {"MLDYEING",   "M.L. Dyeing Ltd",                      "Textile",           "A", 18.90, 10},
            {"SQUARETEX",  "Square Textiles Ltd",                  "Textile",           "A", 56.80, 10},
            {"MAKSONSPIN", "Maksons Spinning Mills Ltd",           "Textile",           "B", 11.50, 10},
            {"ENVOYTEXT",  "Envoy Textiles Ltd",                   "Textile",           "A", 88.40, 10},
            {"DBL",        "DBL Ceramics Ltd",                     "Ceramic",           "A", 55.20, 10},
            {"RAHIMTEXT",  "Rahim Textile Mills Ltd",              "Textile",           "B", 38.10, 10},
            {"AAMRANET",   "Aamra Networks Ltd",                   "IT",                "N", 67.40, 10},
            {"BDCOM",      "BDCOM Online Ltd",                     "IT",                "A", 49.80, 10},
            {"SSLWIRELESS","SSL Wireless Ltd",                     "IT",                "N", 34.60, 10},
            {"IFADAUTOS",  "Ifad Autos Ltd",                       "Engineering",       "A", 57.90, 10},
            {"BAYLEASING", "Bay Leasing & Investment Ltd",         "Non-Bank FI",       "A", 23.50, 10},
            {"DELTALIFE",  "Delta Life Insurance Co Ltd",          "Insurance",         "A", 112.00, 1},
            {"JMISMDL",    "JMI Syringes & Medical Devices Ltd",  "Pharmaceuticals",   "A", 88.30, 10},
            {"SINGER",     "Singer Bangladesh Ltd",                "Engineering",       "A", 162.40, 1},
            {"WALTONHIL",  "Walton Hi-Tech Industries PLC",        "Engineering",       "A", 1375.00, 1},
        };

        for (Object[] s : dseStocks) {
            if (!instrumentRepository.existsById((String) s[0])) {
                Instrument inst = buildInstrument(
                    (String) s[0], (String) s[1], (String) s[2], (String) s[3],
                    BigDecimal.valueOf((Double) s[4]),
                    BigDecimal.valueOf((Integer) s[5]),
                    ExchangeType.DSE
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
        // Set bid/ask around last price
        inst.setBidPrice(prevClose.multiply(new BigDecimal("0.999")).setScale(2, RoundingMode.HALF_UP));
        inst.setAskPrice(prevClose.multiply(new BigDecimal("1.001")).setScale(2, RoundingMode.HALF_UP));
        inst.setVolume(BigDecimal.ZERO);
        inst.setTradedValue(BigDecimal.ZERO);
        return inst;
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
