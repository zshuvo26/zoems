package com.demo.oms.repository;

import com.demo.oms.domain.Order;
import com.demo.oms.enums.ExchangeType;
import com.demo.oms.enums.OrderSide;
import com.demo.oms.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Order findByClientOrderId(String clientOrderId);

    List<Order> findByAccountId(String accountId);

    List<Order> findByAccountIdAndStatus(String accountId, OrderStatus status);

    List<Order> findBySymbolAndExchange(String symbol, ExchangeType exchange);

    List<Order> findByAccountIdOrderByCreatedAtDesc(String accountId);

    List<Order> findByStatusIn(List<OrderStatus> statuses);

    @Query("SELECT o FROM Order o WHERE o.accountId = :accountId AND o.createdAt >= :since ORDER BY o.createdAt DESC")
    List<Order> findRecentByAccount(@Param("accountId") String accountId, @Param("since") LocalDateTime since);

    @Query("SELECT o FROM Order o WHERE o.accountId = :accountId AND o.status NOT IN ('FILLED','CANCELLED','REJECTED','EXPIRED') ORDER BY o.createdAt DESC")
    List<Order> findOpenOrdersByAccount(@Param("accountId") String accountId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.accountId = :accountId AND o.createdAt >= :startOfDay")
    long countOrdersToday(@Param("accountId") String accountId, @Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT o FROM Order o WHERE o.symbol = :symbol AND o.status NOT IN ('FILLED','CANCELLED','REJECTED','EXPIRED')")
    List<Order> findOpenOrdersBySymbol(@Param("symbol") String symbol);

    List<Order> findByParentOrderId(UUID parentOrderId);

    @Query("""
        SELECT o FROM Order o WHERE
            (:accountId IS NULL OR o.accountId = :accountId)
            AND (:symbol IS NULL OR o.symbol = :symbol)
            AND (:isin IS NULL OR o.isin = :isin)
            AND (:boid IS NULL OR o.boid = :boid)
            AND (:dealerId IS NULL OR o.dealerId = :dealerId)
            AND (:exchange IS NULL OR o.exchange = :exchange)
            AND (:status IS NULL OR o.status = :status)
            AND (:side IS NULL OR o.side = :side)
            AND (:dateFrom IS NULL OR o.createdAt >= :dateFrom)
            AND (:dateTo IS NULL OR o.createdAt <= :dateTo)
        ORDER BY o.createdAt DESC
        """)
    List<Order> search(
        @Param("accountId") String accountId,
        @Param("symbol") String symbol,
        @Param("isin") String isin,
        @Param("boid") String boid,
        @Param("dealerId") String dealerId,
        @Param("exchange") ExchangeType exchange,
        @Param("status") OrderStatus status,
        @Param("side") OrderSide side,
        @Param("dateFrom") LocalDateTime dateFrom,
        @Param("dateTo") LocalDateTime dateTo
    );

    @Query("SELECT COUNT(o) FROM Order o WHERE o.accountId = :accountId AND o.symbol = :symbol AND o.side = :side AND o.status NOT IN ('FILLED','CANCELLED','REJECTED','EXPIRED') AND o.createdAt >= :since")
    long countPotentialDuplicates(
        @Param("accountId") String accountId,
        @Param("symbol") String symbol,
        @Param("side") OrderSide side,
        @Param("since") LocalDateTime since
    );
}
