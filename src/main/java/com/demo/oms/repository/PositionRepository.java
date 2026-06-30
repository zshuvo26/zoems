package com.demo.oms.repository;

import com.demo.oms.domain.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PositionRepository extends JpaRepository<Position, UUID> {

    Optional<Position> findByAccountIdAndSymbolAndExchange(String accountId, String symbol, String exchange);

    List<Position> findByAccountId(String accountId);

    @Query("SELECT p FROM Position p WHERE p.accountId = :accountId AND p.netQuantity > 0")
    List<Position> findActivePositionsByAccount(@Param("accountId") String accountId);

    @Query("SELECT COALESCE(SUM(p.marketValue), 0) FROM Position p WHERE p.accountId = :accountId")
    BigDecimal sumPortfolioValue(@Param("accountId") String accountId);

    @Query("SELECT COALESCE(SUM(p.unrealizedPnL), 0) FROM Position p WHERE p.accountId = :accountId")
    BigDecimal sumUnrealizedPnL(@Param("accountId") String accountId);

    @Query("SELECT p FROM Position p WHERE p.symbol = :symbol AND p.netQuantity > 0")
    List<Position> findBySymbol(@Param("symbol") String symbol);

    @Query("SELECT p FROM Position p WHERE p.symbol = :symbol AND p.exchange = :exchange AND p.netQuantity > 0")
    List<Position> findBySymbolAndExchange(@Param("symbol") String symbol, @Param("exchange") String exchange);
}
