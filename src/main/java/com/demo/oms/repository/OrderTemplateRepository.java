package com.demo.oms.repository;

import com.demo.oms.domain.OrderTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderTemplateRepository extends JpaRepository<OrderTemplate, String> {
    List<OrderTemplate> findByAccountIdOrderByUpdatedAtDesc(String accountId);
    boolean existsByAccountIdAndTemplateName(String accountId, String templateName);
}
