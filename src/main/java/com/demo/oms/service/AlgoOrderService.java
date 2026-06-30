package com.demo.oms.service;

import com.demo.oms.domain.AlgoOrder;
import com.demo.oms.dto.*;
import com.demo.oms.enums.*;
import com.demo.oms.exception.OmsException;
import com.demo.oms.repository.AlgoOrderRepository;
import com.demo.oms.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlgoOrderService {

    private final AlgoOrderRepository algoRepository;
    private final OrderService orderService;
    private final InstrumentRepository instrumentRepository;

    @Transactional
    public AlgoOrder createAlgoOrder(AlgoOrderRequest req) {
        AlgoOrder algo = new AlgoOrder();
        algo.setAccountId(req.getAccountId());
        algo.setSymbol(req.getSymbol().toUpperCase());
        algo.setExchange(req.getExchange());
        algo.setSide(req.getSide());
        algo.setAlgoType(req.getAlgoType());
        algo.setTotalQuantity(req.getTotalQuantity());
        algo.setRemainingQuantity(req.getTotalQuantity());
        algo.setPriceLimit(req.getPriceLimit());
        algo.setParticipationRate(req.getParticipationRate());
        algo.setSliceIntervalSeconds(req.getSliceIntervalSeconds() != null ? req.getSliceIntervalSeconds() : 300);
        algo.setStartTime(req.getStartTime() != null ? req.getStartTime() : LocalDateTime.now());
        algo.setEndTime(req.getEndTime());
        algo.setStatus(AlgoStatus.RUNNING);

        // Capture arrival price for IS calculation
        instrumentRepository.findById(algo.getSymbol()).ifPresent(inst ->
                algo.setArrivalPrice(inst.getLastPrice()));

        // Plan total slices for TWAP
        if (req.getAlgoType() == AlgoType.TWAP && req.getEndTime() != null && req.getSliceIntervalSeconds() != null) {
            long durationSeconds = java.time.Duration.between(LocalDateTime.now(), req.getEndTime()).getSeconds();
            int slices = (int) Math.max(1, durationSeconds / req.getSliceIntervalSeconds());
            algo.setTotalSlices(slices);
        } else {
            algo.setTotalSlices(10); // default 10 slices
        }

        return algoRepository.save(algo);
    }

    /**
     * Called by MarketScheduler every market tick.
     * Submits next child slice for each RUNNING algo order.
     */
    @Transactional
    public void executePendingSlices() {
        List<AlgoOrder> running = algoRepository.findByStatus(AlgoStatus.RUNNING);
        for (AlgoOrder algo : running) {
            try {
                executeNextSlice(algo);
            } catch (Exception e) {
                log.warn("Algo slice execution failed for {}: {}", algo.getId(), e.getMessage());
            }
        }
    }

    private void executeNextSlice(AlgoOrder algo) {
        if (algo.getRemainingQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            algo.setStatus(AlgoStatus.COMPLETED);
            algoRepository.save(algo);
            return;
        }

        // Check if start time has been reached
        if (algo.getStartTime() != null && LocalDateTime.now().isBefore(algo.getStartTime())) {
            return;
        }

        // Check end time
        if (algo.getEndTime() != null && LocalDateTime.now().isAfter(algo.getEndTime())) {
            algo.setStatus(AlgoStatus.CANCELLED);
            algo.setCancelReason("Execution window expired with " + algo.getRemainingQuantity() + " shares unexecuted");
            algoRepository.save(algo);
            return;
        }

        // Throttle: enforce slice interval
        if (algo.getLastSliceAt() != null) {
            long elapsed = java.time.Duration.between(algo.getLastSliceAt(), LocalDateTime.now()).getSeconds();
            if (elapsed < algo.getSliceIntervalSeconds()) return;
        }

        BigDecimal sliceQty = computeSliceQuantity(algo);
        if (sliceQty.compareTo(BigDecimal.ZERO) <= 0) return;

        // Build child order
        OrderRequest child = new OrderRequest();
        child.setAccountId(algo.getAccountId());
        child.setSymbol(algo.getSymbol());
        child.setExchange(algo.getExchange());
        child.setSide(algo.getSide());
        child.setQuantity(sliceQty);
        child.setSource("ALGO-" + algo.getAlgoType().name());

        // Use limit if priceLimit set; otherwise MARKET
        if (algo.getPriceLimit() != null) {
            child.setOrderType(OrderType.LIMIT);
            child.setPrice(algo.getPriceLimit());
            child.setTimeInForce(TimeInForce.IOC);
        } else {
            child.setOrderType(OrderType.MARKET);
            child.setTimeInForce(TimeInForce.IOC);
        }

        try {
            orderService.submitOrder(child);
            algo.setCompletedSlices(algo.getCompletedSlices() + 1);
            algo.setExecutedQuantity(algo.getExecutedQuantity().add(sliceQty));
            algo.setRemainingQuantity(algo.getTotalQuantity().subtract(algo.getExecutedQuantity()));
            algo.setLastSliceAt(LocalDateTime.now());

            if (algo.getRemainingQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                algo.setStatus(AlgoStatus.COMPLETED);
            }
            algoRepository.save(algo);
        } catch (Exception e) {
            log.warn("Algo child order failed for {}: {}", algo.getId(), e.getMessage());
        }
    }

    private BigDecimal computeSliceQuantity(AlgoOrder algo) {
        return switch (algo.getAlgoType()) {
            case TWAP -> {
                // Equal slices
                int remaining = algo.getTotalSlices() - algo.getCompletedSlices();
                if (remaining <= 0) yield algo.getRemainingQuantity();
                yield algo.getRemainingQuantity().divide(BigDecimal.valueOf(remaining), 0, RoundingMode.CEILING);
            }
            case VWAP -> {
                // Front-loaded: larger slices early, smaller later
                int total = Math.max(algo.getTotalSlices(), 1);
                int done  = algo.getCompletedSlices();
                double weight = (double)(total - done) / ((total * (total + 1)) / 2.0);
                yield algo.getTotalQuantity().multiply(BigDecimal.valueOf(weight))
                          .setScale(0, RoundingMode.CEILING);
            }
            case POV -> {
                // Participate at participationRate% of ADV (simplified: use fixed slice for now)
                BigDecimal rate = algo.getParticipationRate() != null
                        ? algo.getParticipationRate() : new BigDecimal("0.10");
                yield algo.getTotalQuantity().multiply(rate).setScale(0, RoundingMode.CEILING)
                          .min(algo.getRemainingQuantity());
            }
            default -> {
                // IS / ICEBERG: front-load remaining
                yield algo.getRemainingQuantity().divide(BigDecimal.valueOf(Math.max(1, algo.getTotalSlices() - algo.getCompletedSlices())), 0, RoundingMode.CEILING);
            }
        };
    }

    public AlgoOrder pause(UUID algoId) {
        AlgoOrder algo = findById(algoId);
        if (algo.getStatus() != AlgoStatus.RUNNING)
            throw new OmsException("INVALID_STATE", "Algo is not running");
        algo.setStatus(AlgoStatus.PAUSED);
        return algoRepository.save(algo);
    }

    public AlgoOrder resume(UUID algoId) {
        AlgoOrder algo = findById(algoId);
        if (algo.getStatus() != AlgoStatus.PAUSED)
            throw new OmsException("INVALID_STATE", "Algo is not paused");
        algo.setStatus(AlgoStatus.RUNNING);
        return algoRepository.save(algo);
    }

    @Transactional
    public AlgoOrder cancel(UUID algoId, String reason) {
        AlgoOrder algo = findById(algoId);
        if (algo.getStatus() == AlgoStatus.COMPLETED || algo.getStatus() == AlgoStatus.CANCELLED)
            throw new OmsException("INVALID_STATE", "Algo already " + algo.getStatus());
        algo.setStatus(AlgoStatus.CANCELLED);
        algo.setCancelReason(reason);
        return algoRepository.save(algo);
    }

    public List<AlgoOrder> getByAccount(String accountId) {
        return algoRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    public AlgoOrder findById(UUID algoId) {
        return algoRepository.findById(algoId)
                .orElseThrow(() -> new OmsException("NOT_FOUND", "Algo order not found: " + algoId));
    }
}
