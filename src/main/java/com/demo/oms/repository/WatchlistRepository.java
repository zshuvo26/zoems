package com.demo.oms.repository;

import com.demo.oms.domain.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {

    List<Watchlist> findByAccountIdAndName(String accountId, String name);

    List<Watchlist> findByAccountId(String accountId);

    void deleteByAccountIdAndSymbol(String accountId, String symbol);

    void deleteByAccountIdAndSymbolAndName(String accountId, String symbol, String name);
}
