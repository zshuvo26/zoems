package com.demo.oms.service;

import com.demo.oms.domain.OrderTemplate;
import com.demo.oms.repository.OrderTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderTemplateService {

    private final OrderTemplateRepository repo;

    public List<OrderTemplate> getByAccount(String accountId) {
        return repo.findByAccountIdOrderByUpdatedAtDesc(accountId);
    }

    @Transactional
    public OrderTemplate save(OrderTemplate t) {
        return repo.save(t);
    }

    @Transactional
    public void delete(String id, String accountId) {
        repo.findById(id).ifPresent(t -> {
            if (t.getAccountId().equals(accountId)) repo.delete(t);
        });
    }
}
