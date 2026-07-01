package com.demo.oms.repository;

import com.demo.oms.domain.OmsUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OmsUserRepository extends JpaRepository<OmsUser, Long> {
    Optional<OmsUser> findByUsername(String username);
    boolean existsByUsername(String username);
}
