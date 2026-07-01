package com.demo.oms.repository;

import com.demo.oms.domain.ParentOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParentOrderRepository extends JpaRepository<ParentOrder, UUID> {
    List<ParentOrder> findByAccountIdOrderByCreatedAtDesc(String accountId);
    List<ParentOrder> findByAccountIdAndStatus(String accountId, String status);
}
