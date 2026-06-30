package com.demo.oms.repository;

import com.demo.oms.domain.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface TradeRepository extends JpaRepository<Trade, UUID> {

    List<Trade> findByOrderId(UUID orderId);

    List<Trade> findByAccountIdOrderByTradeTimeDesc(String accountId);

    List<Trade> findByAccountIdAndSymbol(String accountId, String symbol);

    @Query("SELECT t FROM Trade t WHERE t.accountId = :accountId AND t.tradeTime >= :since ORDER BY t.tradeTime DESC")
    List<Trade> findTradesSince(@Param("accountId") String accountId, @Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(t.grossValue), 0) FROM Trade t WHERE t.accountId = :accountId AND t.tradeTime >= :startOfDay")
    BigDecimal sumDailyTurnover(@Param("accountId") String accountId, @Param("startOfDay") LocalDateTime startOfDay);

    List<Trade> findBySettledFalse();

    List<Trade> findBySymbolAndTradeTimeBetween(String symbol, LocalDateTime from, LocalDateTime to);
}
