package com.demo.oms.repository;

import com.demo.oms.domain.IpoListing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IpoListingRepository extends JpaRepository<IpoListing, String> {
    List<IpoListing> findByStatus(String status);
    List<IpoListing> findAllByOrderBySubscriptionOpenDesc();
}
