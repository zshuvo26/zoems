package com.demo.oms.repository;

import com.demo.oms.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByAccountIdOrderByCreatedAtDesc(String accountId);
    List<Notification> findByAccountIdAndIsReadFalseOrderByCreatedAtDesc(String accountId);
    long countByAccountIdAndIsReadFalse(String accountId);
    long countByAccountId(String accountId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.accountId = :accountId AND n.isRead = false")
    int markAllReadForAccount(String accountId);
}
