package com.demo.oms.repository;

import com.demo.oms.domain.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, String> {
    List<PriceAlert> findByAccountIdOrderByCreatedAtDesc(String accountId);
    List<PriceAlert> findBySymbolAndExchangeAndActiveTrue(String symbol, String exchange);
    List<PriceAlert> findByActiveTrue();
}
