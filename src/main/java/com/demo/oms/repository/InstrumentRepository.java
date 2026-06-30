package com.demo.oms.repository;

import com.demo.oms.domain.Instrument;
import com.demo.oms.enums.ExchangeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InstrumentRepository extends JpaRepository<Instrument, String> {

    List<Instrument> findByExchange(ExchangeType exchange);

    List<Instrument> findByExchangeAndBoard(ExchangeType exchange, String board);

    List<Instrument> findByTradeableTrue();

    List<Instrument> findByHaltedTrue();

    List<Instrument> findBySector(String sector);

    @Query(value = "SELECT * FROM instruments WHERE " +
                   "(:exchange IS NULL OR exchange = CAST(:exchange AS TEXT)) AND " +
                   "(:sector IS NULL OR LOWER(sector) LIKE LOWER(CONCAT('%', CAST(:sector AS TEXT), '%'))) AND " +
                   "(:search IS NULL OR UPPER(symbol) LIKE UPPER(CONCAT('%', CAST(:search AS TEXT), '%')) " +
                   "                 OR UPPER(name)   LIKE UPPER(CONCAT('%', CAST(:search AS TEXT), '%')))",
           countQuery = "SELECT COUNT(*) FROM instruments WHERE " +
                        "(:exchange IS NULL OR exchange = CAST(:exchange AS TEXT)) AND " +
                        "(:sector IS NULL OR LOWER(sector) LIKE LOWER(CONCAT('%', CAST(:sector AS TEXT), '%'))) AND " +
                        "(:search IS NULL OR UPPER(symbol) LIKE UPPER(CONCAT('%', CAST(:search AS TEXT), '%')) " +
                        "                 OR UPPER(name)   LIKE UPPER(CONCAT('%', CAST(:search AS TEXT), '%')))",
           nativeQuery = true)
    Page<Instrument> findFiltered(@Param("exchange") String exchange,
                                  @Param("sector") String sector,
                                  @Param("search") String search,
                                  Pageable pageable);

    @Query("SELECT i FROM Instrument i WHERE (UPPER(i.symbol) LIKE UPPER(CONCAT('%', :query, '%')) OR UPPER(i.name) LIKE UPPER(CONCAT('%', :query, '%'))) AND i.tradeable = true")
    List<Instrument> searchBySymbolOrName(@Param("query") String query);

    @Query("SELECT DISTINCT i.sector FROM Instrument i WHERE i.exchange = :exchange ORDER BY i.sector")
    List<String> findDistinctSectors(@Param("exchange") ExchangeType exchange);
}
