package com.demo.oms.repository;

import com.demo.oms.domain.CorporateAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CorporateActionRepository extends JpaRepository<CorporateAction, UUID> {
    List<CorporateAction> findBySymbolOrderByExDateDesc(String symbol);
    List<CorporateAction> findByProcessedFalseAndExDateLessThanEqual(LocalDate date);
    List<CorporateAction> findByExDateBetweenOrderByExDateAsc(LocalDate from, LocalDate to);
    List<CorporateAction> findAllByOrderByExDateDesc();
}
