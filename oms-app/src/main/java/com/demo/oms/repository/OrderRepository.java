package com.demo.oms.repository;

import com.demo.oms.domain.Order;
import com.demo.oms.enums.ExchangeType;
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
}
