# ZOEMS — Bangladesh FIX Order Management System

A professional-grade OMS/EMS for the Bangladesh capital market (DSE & CSE), built on **FIX Protocol 4.4**, **Spring Boot 3.2**, and **React Native (Expo)**.

## Repository Structure

```
zoems/
├── fix-server-simulator/   ← FIX 4.4 acceptor — simulates exchange matching engine
├── oms-app/                ← Spring Boot 3.2 backend — order routing, portfolio, risk
└── oms-mobile/             ← React Native (Expo SDK 51) — trader mobile app
```

## Components

### fix-server-simulator
Java / QuickFIX/J FIX acceptor that simulates the exchange matching engine.
- Listens on port **9878** (FIX 4.4 FIXT/FAST)
- Auto-fills orders: 50% partial fill then full fill
- Sends `ExecutionReport` (New / Partial / Fill / Cancel) back to OMS

### oms-app (Backend)
Spring Boot 3.2 + JPA backend connecting to the FIX simulator.
- REST API on port **9091**
- FIX session initiator connecting to simulator on port **9878**
- Features: order management, portfolio P&L, algo execution (TWAP/VWAP/POV/IS/ICEBERG), pre-trade cost, price alerts, settlement T+2, compliance rules, foreign flow, IPO, corporate actions

### oms-mobile (Mobile)
React Native Expo SDK 51 trader app.
- Connects to backend at `http://<server-ip>:9091`
- Features: live market data, order blotter, portfolio dashboard, algo orders, basket trading, watchlists, price alerts, order templates, circuit breaker monitor, foreign investor flow, cash ledger, profit calculator, AI insights

## Quick Start

### 1. Start FIX Simulator
```bash
cd fix-server-simulator
mvn spring-boot:run
# Listening on 0.0.0.0:9878
```

### 2. Start OMS Backend
```bash
cd oms-app
mvn spring-boot:run
# API available at http://localhost:9091
```

### 3. Run Mobile App
```bash
cd oms-mobile
npm install
npx expo start
# Update BASE_URL in src/api/client.ts to your server IP:9091
```

## Bangladesh Market Configuration
- Exchanges: DSE (Dhaka) and CSE (Chittagong)
- Circuit breakers: ±10% daily price limit
- Settlement: T+2
- Market hours: Sunday–Thursday 10:00–14:30 BDT
- Fee structure: Brokerage 0.50% + SEC Levy 0.05% + CDBL 0.015% + Exchange 0.005% + AIT 0.10% (sell) + Stamp Duty 0.015% (buy)

## Default Credentials
| Username | Password | Role |
|---|---|---|
| admin | admin123 | ADMIN |
| dealer1 | dealer123 | DEALER |
| trader1 | trader123 | TRADER |
