package com.demo.oms.repository;

import com.demo.oms.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, String> {

    Optional<Account> findByEmail(String email);

    List<Account> findByTraderId(String traderId);

    List<Account> findByBrokerId(String brokerId);

    List<Account> findByActiveTrue();
}
