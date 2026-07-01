package com.demo.oms.service;

import com.demo.oms.domain.Account;
import com.demo.oms.domain.LedgerEntry;
import com.demo.oms.repository.AccountRepository;
import com.demo.oms.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerRepository   ledgerRepo;
    private final AccountRepository  accountRepo;

    public Page<LedgerEntry> getHistory(String accountId, int page, int size) {
        return ledgerRepo.findByAccountIdOrderByTimestampDesc(accountId, PageRequest.of(page, size));
    }

    @Transactional
    public LedgerEntry record(String accountId, String entryType, BigDecimal amount,
                              String description, String referenceId,
                              String symbol, String exchange) {
        Account acct = accountRepo.findById(accountId).orElseThrow();
        BigDecimal balance = acct.getCashBalance().add(amount);
        acct.setCashBalance(balance);
        acct.setAvailableFunds(balance.subtract(acct.getBlockedAmount()));
        accountRepo.save(acct);

        LedgerEntry entry = new LedgerEntry();
        entry.setAccountId(accountId);
        entry.setEntryType(entryType);
        entry.setAmount(amount);
        entry.setBalanceAfter(balance);
        entry.setDescription(description);
        entry.setReferenceId(referenceId);
        entry.setSymbol(symbol);
        entry.setExchange(exchange);
        entry.setTimestamp(LocalDateTime.now());
        return ledgerRepo.save(entry);
    }

    public BigDecimal totalCommission(String accountId) {
        return ledgerRepo.sumCommissionByAccount(accountId);
    }
}
