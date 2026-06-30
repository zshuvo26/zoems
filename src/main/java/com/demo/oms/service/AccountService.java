package com.demo.oms.service;

import com.demo.oms.domain.Account;
import com.demo.oms.domain.RiskLimit;
import com.demo.oms.repository.AccountRepository;
import com.demo.oms.repository.RiskLimitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AccountService {

    @Autowired private AccountRepository accountRepository;
    @Autowired private RiskLimitRepository riskLimitRepository;
    @Autowired private PositionService positionService;

    public Account getAccount(String accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new com.demo.oms.exception.OmsException("ACCOUNT_NOT_FOUND", "Account not found: " + accountId));
    }

    public List<Account> getAllAccounts() {
        return accountRepository.findByActiveTrue();
    }

    @Transactional
    public Account createAccount(Account account) {
        account.setAvailableFunds(account.getCashBalance());
        Account saved = accountRepository.save(account);

        // Create default risk limits
        RiskLimit limits = new RiskLimit();
        limits.setAccountId(saved.getId());
        riskLimitRepository.save(limits);

        return saved;
    }

    @Transactional
    public Account deposit(String accountId, BigDecimal amount) {
        Account account = getAccount(accountId);
        account.setCashBalance(account.getCashBalance().add(amount));
        account.setAvailableFunds(account.getCashBalance().subtract(account.getBlockedAmount()));
        account.setTotalEquity(account.getAvailableFunds().add(account.getPortfolioValue()));
        return accountRepository.save(account);
    }

    @Transactional
    public Account withdraw(String accountId, BigDecimal amount) {
        Account account = getAccount(accountId);
        if (account.getAvailableFunds().compareTo(amount) < 0) {
            throw new com.demo.oms.exception.RiskLimitException(
                "Insufficient available funds: BDT " + account.getAvailableFunds());
        }
        account.setCashBalance(account.getCashBalance().subtract(amount));
        account.setAvailableFunds(account.getCashBalance().subtract(account.getBlockedAmount()));
        return accountRepository.save(account);
    }

    @Transactional
    public void refreshPortfolioValue(String accountId) {
        positionService.markToMarket(accountId);
    }

    public RiskLimit getRiskLimits(String accountId) {
        return riskLimitRepository.findByAccountId(accountId)
                .orElseGet(() -> {
                    RiskLimit rl = new RiskLimit();
                    rl.setAccountId(accountId);
                    return rl;
                });
    }

    @Transactional
    public RiskLimit updateRiskLimits(String accountId, RiskLimit limits) {
        RiskLimit existing = riskLimitRepository.findByAccountId(accountId)
                .orElse(new RiskLimit());
        existing.setAccountId(accountId);
        existing.setMaxOrderValue(limits.getMaxOrderValue());
        existing.setMaxOrderQuantity(limits.getMaxOrderQuantity());
        existing.setMaxPositionValue(limits.getMaxPositionValue());
        existing.setMaxExposurePerSymbol(limits.getMaxExposurePerSymbol());
        existing.setMaxDailyTurnover(limits.getMaxDailyTurnover());
        existing.setMaxDailyLoss(limits.getMaxDailyLoss());
        existing.setMaxOrdersPerDay(limits.getMaxOrdersPerDay());
        existing.setEnableShortSelling(limits.isEnableShortSelling());
        existing.setEnableMargin(limits.isEnableMargin());
        return riskLimitRepository.save(existing);
    }
}
