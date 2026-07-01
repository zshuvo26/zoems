package com.demo.oms.repository;

import com.demo.oms.domain.LatencyMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface LatencyMetricRepository extends JpaRepository<LatencyMetric, UUID> {

    List<LatencyMetric> findByComponentAndTimestampAfterOrderByTimestampDesc(String component, LocalDateTime since);

    @Query("SELECT m FROM LatencyMetric m WHERE m.timestamp >= :since ORDER BY m.timestamp DESC")
    List<LatencyMetric> findAllSince(@Param("since") LocalDateTime since);

    @Query("SELECT m FROM LatencyMetric m WHERE m.alert = true ORDER BY m.timestamp DESC")
    List<LatencyMetric> findAlerts();

    @Query("SELECT m FROM LatencyMetric m WHERE m.alert = true AND m.timestamp >= :since ORDER BY m.timestamp DESC")
    List<LatencyMetric> findRecentAlerts(@Param("since") LocalDateTime since);
}
