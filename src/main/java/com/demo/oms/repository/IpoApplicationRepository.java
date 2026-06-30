package com.demo.oms.repository;

import com.demo.oms.domain.IpoApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IpoApplicationRepository extends JpaRepository<IpoApplication, UUID> {
    List<IpoApplication> findByAccountIdOrderByCreatedAtDesc(String accountId);
    List<IpoApplication> findByIpoId(String ipoId);
    Optional<IpoApplication> findByIpoIdAndAccountId(String ipoId, String accountId);
    boolean existsByIpoIdAndAccountId(String ipoId, String accountId);
}
