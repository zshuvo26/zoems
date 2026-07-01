package com.demo.oms.repository;

import com.demo.oms.domain.AlgoOrder;
import com.demo.oms.enums.AlgoStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlgoOrderRepository extends JpaRepository<AlgoOrder, UUID> {
    List<AlgoOrder> findByAccountIdOrderByCreatedAtDesc(String accountId);
    List<AlgoOrder> findByStatus(AlgoStatus status);
    List<AlgoOrder> findByStatusIn(List<AlgoStatus> statuses);
}
