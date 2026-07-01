package com.demo.oms.service;

import com.demo.oms.domain.*;
import com.demo.oms.exception.OmsException;
import com.demo.oms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class IpoService {

    private final IpoListingRepository listingRepository;
    private final IpoApplicationRepository applicationRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;

    public List<IpoListing> getOpenIpos() {
        return listingRepository.findByStatus("OPEN");
    }

    public List<IpoListing> getAllIpos() {
        return listingRepository.findAllByOrderBySubscriptionOpenDesc();
    }

    public IpoListing getIpo(String ipoId) {
        return listingRepository.findById(ipoId)
                .orElseThrow(() -> new OmsException("NOT_FOUND", "IPO not found: " + ipoId));
    }

    @Transactional
    public IpoApplication applyForIpo(String ipoId, String accountId, int lots) {
        IpoListing ipo = getIpo(ipoId);

        if (!"OPEN".equals(ipo.getStatus())) {
            throw new OmsException("IPO_CLOSED", "IPO " + ipoId + " is not open for subscription");
        }
        if (LocalDate.now().isAfter(ipo.getSubscriptionClose())) {
            throw new OmsException("IPO_CLOSED", "Subscription period has ended for " + ipoId);
        }
        if (LocalDate.now().isBefore(ipo.getSubscriptionOpen())) {
            throw new OmsException("IPO_NOT_OPEN", "Subscription not yet open for " + ipoId);
        }
        if (applicationRepository.existsByIpoIdAndAccountId(ipoId, accountId)) {
            throw new OmsException("DUPLICATE_APPLICATION", "Account already applied for IPO " + ipoId);
        }
        if (lots < ipo.getMinLots() || lots > ipo.getMaxLots()) {
            throw new OmsException("INVALID_LOTS",
                    String.format("Lots must be between %d and %d", ipo.getMinLots(), ipo.getMaxLots()));
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new OmsException("NOT_FOUND", "Account not found"));

        BigDecimal totalAmount = BigDecimal.valueOf((long) lots * ipo.getLotSize()).multiply(ipo.getIssuePrice())
                .setScale(2, RoundingMode.HALF_UP);

        if (account.getAvailableFunds().compareTo(totalAmount) < 0) {
            throw new OmsException("INSUFFICIENT_FUNDS",
                    String.format("Required BDT %.2f, available BDT %.2f", totalAmount, account.getAvailableFunds()));
        }

        // Deduct application amount (lien on account)
        account.setAvailableFunds(account.getAvailableFunds().subtract(totalAmount));
        account.setBlockedAmount(account.getBlockedAmount().add(totalAmount));
        accountRepository.save(account);

        IpoApplication app = new IpoApplication();
        app.setIpoId(ipoId);
        app.setAccountId(accountId);
        app.setSymbol(ipo.getSymbol());
        app.setAppliedLots(lots);
        app.setLotSize(ipo.getLotSize());
        app.setIssuePrice(ipo.getIssuePrice());
        app.setAmountPaid(totalAmount);
        app.setStatus("PENDING");

        return applicationRepository.save(app);
    }

    /**
     * Admin: run pro-rata allotment for an IPO.
     * In Bangladesh, allotment is typically done via lottery for oversubscribed IPOs.
     */
    @Transactional
    public void processAllotment(String ipoId) {
        IpoListing ipo = getIpo(ipoId);
        ipo.setStatus("ALLOTMENT_DONE");
        listingRepository.save(ipo);

        List<IpoApplication> apps = applicationRepository.findByIpoId(ipoId);
        long totalSharesApplied = apps.stream().mapToLong(a -> (long) a.getAppliedLots() * a.getLotSize()).sum();
        boolean oversubscribed = totalSharesApplied > ipo.getTotalSharesOnOffer();

        Random rng = new Random();

        for (IpoApplication app : apps) {
            int allottedLots;

            if (!oversubscribed) {
                allottedLots = app.getAppliedLots(); // everyone gets what they applied for
            } else {
                // Lottery: ~50% chance of getting 1 lot (simplified BD lottery model)
                allottedLots = rng.nextBoolean() ? Math.min(1, app.getAppliedLots()) : 0;
            }

            BigDecimal allottedAmount = BigDecimal.valueOf((long) allottedLots * app.getLotSize())
                    .multiply(app.getIssuePrice()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal refund = app.getAmountPaid().subtract(allottedAmount);

            app.setAllottedLots(allottedLots);
            app.setRefundAmount(refund);
            app.setAllotmentDate(LocalDate.now());
            app.setStatus(allottedLots > 0 ? "ALLOTTED" : "NOT_ALLOTTED");
            applicationRepository.save(app);

            // Refund unallotted amount
            if (refund.compareTo(BigDecimal.ZERO) > 0) {
                accountRepository.findById(app.getAccountId()).ifPresent(acc -> {
                    acc.setBlockedAmount(acc.getBlockedAmount().subtract(app.getAmountPaid()));
                    acc.setCashBalance(acc.getCashBalance().add(refund));
                    acc.setAvailableFunds(acc.getCashBalance().subtract(acc.getBlockedAmount()));
                    accountRepository.save(acc);
                });
            }

            notificationService.notifyIpoAllotment(
                    app.getAccountId(), ipoId, ipo.getSymbol(), allottedLots);
            log.info("IPO {} allotted {} lots to account {}", ipoId, allottedLots, app.getAccountId());
        }
    }

    public List<IpoApplication> getApplicationsByAccount(String accountId) {
        return applicationRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    public List<IpoApplication> getApplicationsByIpo(String ipoId) {
        return applicationRepository.findByIpoId(ipoId);
    }
}
