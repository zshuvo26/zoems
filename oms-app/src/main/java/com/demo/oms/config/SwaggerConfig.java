package com.demo.oms.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI omsOpenAPI() {
        return new OpenAPI()
                .info(buildInfo())
                .externalDocs(new ExternalDocumentation()
                        .description("Bangladesh Securities and Exchange Commission (BSEC)")
                        .url("https://www.sec.gov.bd"))
                .servers(List.of(
                        new Server().url("http://localhost:9091").description("Local Development"),
                        new Server().url("http://localhost:8080").description("Default Port")
                ))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter the JWT token obtained from POST /api/v1/auth/login. " +
                                             "Format: Bearer <token>")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .tags(buildTags());
    }

    private Info buildInfo() {
        return new Info()
                .title("Professional OMS — Bangladesh DSE/CSE")
                .description("""
                        ## Production-Grade Order Management System

                        Built for **Dhaka Stock Exchange (DSE)** and **Chittagong Stock Exchange (CSE)** \
                        compliance, this OMS implements the full order lifecycle over **FIX 4.4** protocol \
                        with world-class institutional features.

                        ---

                        ### Authentication
                        All endpoints (except `/api/v1/auth/login`) require a **JWT Bearer token**.

                        1. Call `POST /api/v1/auth/login` with username/password
                        2. Copy the `data.token` from the response
                        3. Click **Authorize** above and paste: `Bearer <token>`

                        **Default credentials:**
                        | Role | Username | Password | Access |
                        |------|----------|----------|--------|
                        | ADMIN | admin | admin123 | Full access |
                        | DEALER | dealer | dealer123 | Trade any account |
                        | TRADER | trader | trader123 | Own account only |
                        | VIEWER | viewer | viewer123 | Read-only |

                        ---

                        ### Demo Accounts
                        | BO Number | Name | Type | Balance |
                        |-----------|------|------|---------|
                        | 1201880012345678 | Rahul Ahmed | Individual | BDT 5,00,000 |
                        | 1201880087654321 | Dhaka Capital Management | Corporate | BDT 5,00,00,000 |

                        ---

                        ### Bangladesh Market Rules (BSEC)
                        - **Trading hours:** 10:00–14:30 BST (UTC+6), Sunday–Thursday
                        - **Circuit breakers:** ±10% daily price movement limit
                        - **Settlement:** T+2 (skips Friday/Saturday and public holidays)
                        - **Currency:** BDT (Bangladeshi Taka)
                        - **Fees:** Brokerage 0.50% + SEC levy 0.05% + AIT 0.10% (sell only) + DSE/CSE fee 0.03%

                        ---

                        ### Regulatory Fees on Trades
                        | Fee | Rate | Applied On |
                        |-----|------|------------|
                        | Brokerage | 0.50% | Both sides |
                        | SEC Levy | 0.05% | Both sides |
                        | AIT | 0.10% | Sell only |
                        | DSE/CSE Fee | 0.03% | Both sides |

                        ---

                        ### WebSocket Real-Time Feeds
                        Connect to `ws://localhost:9091/ws` (SockJS) and subscribe:
                        - `/topic/market/{symbol}` — live price updates (every 5s)
                        - `/topic/orders/{accountId}` — order status changes
                        - `/topic/notifications/{accountId}` — alerts and fills
                        """)
                .version("2.0.0")
                .contact(new Contact()
                        .name("OMS Platform Team")
                        .email("zshuvo26@gmail.com")
                        .url("https://github.com/fixoms"))
                .license(new License()
                        .name("Proprietary — Bangladesh Capital Market")
                        .url("https://www.sec.gov.bd"));
    }

    private List<Tag> buildTags() {
        return List.of(
                new Tag().name("Authentication").description("JWT login — get Bearer token"),
                new Tag().name("Orders").description("Order lifecycle: submit, cancel, amend, query, audit"),
                new Tag().name("Basket Trading").description("Submit multiple orders in one call — program trading"),
                new Tag().name("Algorithmic Orders").description("TWAP, VWAP, POV, IS automated execution"),
                new Tag().name("Trades").description("Executed trade records with full fee breakdown"),
                new Tag().name("Portfolio").description("Real-time P&L, positions, mark-to-market"),
                new Tag().name("Performance Attribution").description("Return vs DSEX benchmark — alpha, sector breakdown"),
                new Tag().name("Transaction Cost Analysis").description("Slippage, implementation shortfall, market impact"),
                new Tag().name("Accounts").description("Beneficiary Owner (BO) account management"),
                new Tag().name("Instruments").description("DSE/CSE listed securities — 40 DSE + 5 CSE stocks"),
                new Tag().name("Market Data").description("Live quotes, OHLCV, circuit limits, market status"),
                new Tag().name("Order Book (L2)").description("5-level bid/ask depth with spread calculation"),
                new Tag().name("Market Breadth").description("Top gainers/losers, A/D ratio, most active"),
                new Tag().name("Watchlist").description("Personal symbol watchlist with live quotes and price alerts"),
                new Tag().name("Compliance").description("Pre-trade compliance: wash trade, duplicate order, restricted securities"),
                new Tag().name("Corporate Actions").description("Dividend, bonus share, stock split — auto position adjustment"),
                new Tag().name("IPO Management").description("IPO subscription, pro-rata/lottery allotment, refunds"),
                new Tag().name("Margin Trading").description("Margin utilization, buying power, margin call monitoring"),
                new Tag().name("Settlement").description("T+2 settlement tracking — pending, settled, failed"),
                new Tag().name("Notifications").description("In-app alerts: fills, price alerts, corporate actions, margin calls"),
                new Tag().name("Regulatory Reporting").description("BSEC daily trade report, position report"),
                new Tag().name("System").description("Health, market status, FIX session diagnostics")
        );
    }
}
