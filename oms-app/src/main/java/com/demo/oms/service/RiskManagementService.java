package com.demo.oms.service;

import com.demo.oms.domain.*;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderType;
import com.demo.oms.exception.RiskLimitException;
import com.demo.oms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@Service
public class RiskManagementService {

    @Autowired private RiskLimitRepository riskLimitRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private TradeRepository tradeRepository;
    @Autowired private PositionRepository positionRepository;
    @Autowired private InstrumentRepository instrumentRepository;
    @Autowired private AccountRepository accountRepository;

    /**
     * Full pre-trade risk check. Throws RiskLimitException if any check fails.
     */
    public void validateOrder(Order order) {
        Account account = accountRepository.findById(order.getAccountId())
                .orElseThrow(() -> new RiskLimitException("Account not found: " + order.getAccountId()));

        if (!account.isActive())         throw new RiskLimitException("Account is inactive");
        if (!account.isTradingEnabled()) throw new RiskLimitException("Trading is disabled for this account");

        Instrument instrument = instrumentRepository.findById(order.getSymbol())
                .orElseThrow(() -> new RiskLimitException("Instrument not found: " + order.getSymbol()));

        if (!instrument.isTradeable()) throw new RiskLimitException("Instrument is not tradeable: " + order.getSymbol());
        if (instrument.isHalted())     throw new RiskLimitException("Instrument is halted: " + order.getSymbol() + " — " + instrument.getHaltReason());

        RiskLimit limits = riskLimitRepository.findByAccountId(order.getAccountId())
                .orElse(defaultLimits(order.getAccountId()));

        checkOrderQuantity(order, limits);
        checkOrderValue(order, limits, instrument);
        checkCircuitBreaker(order, instrument);
        checkFundsForBuy(order, account);
        checkPositionForSell(order, account, limits);
        checkExposureConcentration(order, limits);
        checkDailyLoss(account, limits);
        checkDailyOrderCount(order, limits);
        checkDailyTurnover(order, limits);
        checkShortSelling(order, limits);
    }

    private void checkOrderQuantity(Order order, RiskLimit limits) {
        if (order.getQuantity().compareTo(limits.getMaxOrderQuantity()) > 0) {
            throw new RiskLimitException(
                String.format("Order quantity %.0f exceeds limit %.0f",
                    order.getQuantity(), limits.getMaxOrderQuantity()));
        }
    }

    private void checkOrderValue(Order order, RiskLimit limits, Instrument instrument) {
        BigDecimal effectivePrice = order.getPrice() != null ? order.getPrice()
                : (instrument.getLastPrice() != null ? instrument.getLastPrice() : BigDecimal.ZERO);
        BigDecimal orderValue = order.getQuantity().multiply(effectivePrice);

        if (orderValue.compareTo(limits.getMaxOrderValue()) > 0) {
            throw new RiskLimitException(
                String.format("Order value BDT %.2f exceeds limit BDT %.2f", orderValue, limits.getMaxOrderValue()));
        }
    }

    private void checkCircuitBreaker(Order order, Instrument instrument) {
        if (order.getOrderType() == OrderType.MARKET) return; // market orders bypass price check
        if (order.getPrice() == null) return;

        if (instrument.getUpperCircuitLimit() != null &&
            order.getPrice().compareTo(instrument.getUpperCircuitLimit()) > 0) {
            throw new RiskLimitException(
                String.format("Price BDT %.2f exceeds upper circuit limit BDT %.2f for %s",
                    order.getPrice(), instrument.getUpperCircuitLimit(), order.getSymbol()));
        }

        if (instrument.getLowerCircuitLimit() != null &&
            order.getPrice().compareTo(instrument.getLowerCircuitLimit()) < 0) {
            throw new RiskLimitException(
                String.format("Price BDT %.2f is below lower circuit limit BDT %.2f for %s",
                    order.getPrice(), instrument.getLowerCircuitLimit(), order.getSymbol()));
        }
    }

    private void checkFundsForBuy(Order order, Account account) {
        if (order.getSide() != OrderSide.BUY) return;

        BigDecimal effectivePrice = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;
        BigDecimal required = order.getQuantity().multiply(effectivePrice);

        if (account.getAvailableFunds().compareTo(required) < 0) {
            throw new RiskLimitException(
                String.format("Insufficient funds: available BDT %.2f, required BDT %.2f",
                    account.getAvailableFunds(), required));
        }
    }

    private void checkPositionForSell(Order order, Account account, RiskLimit limits) {
        if (order.getSide() == OrderSide.BUY) return;
        if (order.getSide() == OrderSide.SELL_SHORT) {
            if (!limits.isEnableShortSelling()) {
                throw new RiskLimitException("Short selling is not enabled for this account (BSEC approval required)");
            }
            return;
        }

        Optional<Position> pos = positionRepository.findByAccountIdAndSymbolAndExchange(
                order.getAccountId(), order.getSymbol(), order.getExchange().name());
        BigDecimal available = pos.map(Position::getNetQuantity).orElse(BigDecimal.ZERO);

        if (available.compareTo(order.getQuantity()) < 0) {
            throw new RiskLimitException(
                String.format("Insufficient holdings for %s: have %.0f, selling %.0f",
                    order.getSymbol(), available, order.getQuantity()));
        }
    }

    private void checkExposureConcentration(Order order, RiskLimit limits) {
        if (order.getSide() != OrderSide.BUY) return;
        if (order.getPrice() == null) return;

        Optional<Position> pos = positionRepository.findByAccountIdAndSymbolAndExchange(
                order.getAccountId(), order.getSymbol(), order.getExchange().name());
        BigDecimal currentExposure = pos.map(Position::getMarketValue).orElse(BigDecimal.ZERO);
        BigDecimal newOrderValue = order.getQuantity().multiply(order.getPrice());
        BigDecimal totalExposure = currentExposure.add(newOrderValue);

        if (totalExposure.compareTo(limits.getMaxExposurePerSymbol()) > 0) {
            throw new RiskLimitException(
                String.format("Position in %s would reach BDT %.2f, exceeding per-symbol limit BDT %.2f",
                    order.getSymbol(), totalExposure, limits.getMaxExposurePerSymbol()));
        }
    }

    private void checkDailyLoss(Account account, RiskLimit limits) {
        if (account.getDayPnL() != null &&
            account.getDayPnL().compareTo(limits.getMaxDailyLoss().negate()) < 0) {
            throw new RiskLimitException(
                String.format("Daily loss limit breached: P&L BDT %.2f, limit BDT %.2f",
                    account.getDayPnL(), limits.getMaxDailyLoss().negate()));
        }
    }

    private void checkDailyOrderCount(Order order, RiskLimit limits) {
        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIDNIGHT);
        long count = orderRepository.countOrdersToday(order.getAccountId(), startOfDay);
        if (count >= limits.getMaxOrdersPerDay()) {
            throw new RiskLimitException(
                String.format("Daily order limit %d reached", limits.getMaxOrdersPerDay()));
        }
    }

    private void checkDailyTurnover(Order order, RiskLimit limits) {
        if (order.getPrice() == null) return;
        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIDNIGHT);
        BigDecimal turnover = tradeRepository.sumDailyTurnover(order.getAccountId(), startOfDay);
        BigDecimal newOrderValue = order.getQuantity().multiply(order.getPrice());
        if (turnover.add(newOrderValue).compareTo(limits.getMaxDailyTurnover()) > 0) {
            throw new RiskLimitException(
                String.format("Daily turnover limit BDT %.2f would be exceeded", limits.getMaxDailyTurnover()));
        }
    }

    private void checkShortSelling(Order order, RiskLimit limits) {
        if (order.getSide() == OrderSide.SELL_SHORT && !limits.isEnableShortSelling()) {
            throw new RiskLimitException("Short selling not enabled for account " + order.getAccountId());
        }
    }

    private RiskLimit defaultLimits(String accountId) {
        RiskLimit rl = new RiskLimit();
        rl.setAccountId(accountId);
        return rl;
    }

    /**
     * Block funds when a buy order is placed (pre-trade fund reservation).
     */
    public void blockFunds(Account account, BigDecimal amount) {
        account.setBlockedAmount(account.getBlockedAmount().add(amount));
        account.setAvailableFunds(account.getCashBalance().subtract(account.getBlockedAmount()));
        accountRepository.save(account);
    }

    /**
     * Release blocked funds on cancel/reject.
     */
    public void releaseFunds(Account account, BigDecimal amount) {
        BigDecimal release = amount.min(account.getBlockedAmount());
        account.setBlockedAmount(account.getBlockedAmount().subtract(release));
        account.setAvailableFunds(account.getCashBalance().subtract(account.getBlockedAmount()));
        accountRepository.save(account);
    }
}
