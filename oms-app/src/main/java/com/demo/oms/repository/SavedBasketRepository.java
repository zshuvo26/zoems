package com.demo.oms.repository;

import com.demo.oms.domain.SavedBasket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedBasketRepository extends JpaRepository<SavedBasket, UUID> {
    List<SavedBasket> findByAccountIdOrderByCreatedAtDesc(String accountId);
    Optional<SavedBasket> findByAccountIdAndBasketName(String accountId, String basketName);
    List<SavedBasket> findByAccountIdAndStatus(String accountId, String status);
}
