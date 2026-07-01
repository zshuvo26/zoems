package com.demo.oms.service;

import com.demo.oms.domain.SavedBasket;
import com.demo.oms.dto.*;
import com.demo.oms.exception.OmsException;
import com.demo.oms.repository.SavedBasketRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SavedBasketService {

    @Autowired private SavedBasketRepository basketRepo;
    @Autowired private OrderService orderService;
    @Autowired private ObjectMapper objectMapper;

    @Transactional
    public SavedBasketResponse save(String accountId, String basketName, String description,
                                    boolean allOrNone, List<OrderRequest> orders) {
        SavedBasket basket = new SavedBasket();
        basket.setAccountId(accountId);
        basket.setBasketName(basketName);
        basket.setDescription(description);
        basket.setAllOrNone(allOrNone);
        basket.setStatus("DRAFT");
        basket.setOrderCount(orders.size());
        basket.setOrdersJson(serializeOrders(orders));
        basket = basketRepo.save(basket);
        return SavedBasketResponse.from(basket);
    }

    public List<SavedBasketResponse> list(String accountId) {
        return basketRepo.findByAccountIdOrderByCreatedAtDesc(accountId)
            .stream().map(SavedBasketResponse::from).collect(Collectors.toList());
    }

    public SavedBasketResponse get(UUID basketId) {
        return SavedBasketResponse.from(find(basketId));
    }

    @Transactional
    public BasketOrderResult execute(UUID basketId) {
        SavedBasket basket = find(basketId);
        if ("DRAFT".equals(basket.getStatus())) {
            throw new OmsException("BASKET_NOT_APPROVED", "Basket must be APPROVED before execution");
        }
        List<OrderRequest> orders = deserializeOrders(basket.getOrdersJson());
        BasketOrderRequest req = new BasketOrderRequest();
        req.setBasketName(basket.getBasketName());
        req.setAccountId(basket.getAccountId());
        req.setAllOrNone(basket.isAllOrNone());
        req.setOrders(orders);

        // Delegate to existing BasketOrderService via OrderService
        BasketOrderResult result = executeBasket(basket.getAccountId(), basket.getBasketName(),
                basket.isAllOrNone(), orders);

        basket.setStatus("EXECUTED");
        basketRepo.save(basket);
        return result;
    }

    @Transactional
    public SavedBasketResponse approve(UUID basketId) {
        SavedBasket basket = find(basketId);
        basket.setStatus("APPROVED");
        return SavedBasketResponse.from(basketRepo.save(basket));
    }

    @Transactional
    public SavedBasketResponse schedule(UUID basketId, LocalDateTime scheduledAt) {
        SavedBasket basket = find(basketId);
        basket.setScheduledAt(scheduledAt);
        basket.setStatus("SCHEDULED");
        return SavedBasketResponse.from(basketRepo.save(basket));
    }

    @Transactional
    public SavedBasketResponse clone(UUID basketId, String newName) {
        SavedBasket source = find(basketId);
        SavedBasket copy = new SavedBasket();
        copy.setAccountId(source.getAccountId());
        copy.setBasketName(newName);
        copy.setDescription("Clone of: " + source.getBasketName());
        copy.setAllOrNone(source.isAllOrNone());
        copy.setStatus("DRAFT");
        copy.setOrderCount(source.getOrderCount());
        copy.setOrdersJson(source.getOrdersJson());
        return SavedBasketResponse.from(basketRepo.save(copy));
    }

    @Transactional
    public void delete(UUID basketId) {
        basketRepo.deleteById(basketId);
    }

    @Transactional
    public SavedBasketResponse updateOrders(UUID basketId, List<OrderRequest> orders) {
        SavedBasket basket = find(basketId);
        basket.setOrdersJson(serializeOrders(orders));
        basket.setOrderCount(orders.size());
        basket.setStatus("DRAFT");
        return SavedBasketResponse.from(basketRepo.save(basket));
    }

    private SavedBasket find(UUID basketId) {
        return basketRepo.findById(basketId)
            .orElseThrow(() -> new OmsException("NOT_FOUND", "Saved basket not found: " + basketId));
    }

    private String serializeOrders(List<OrderRequest> orders) {
        try {
            return objectMapper.writeValueAsString(orders);
        } catch (Exception e) {
            throw new OmsException("SERIALIZATION_ERROR", "Failed to serialize basket orders");
        }
    }

    private List<OrderRequest> deserializeOrders(String json) {
        try {
            if (json == null || json.isBlank()) return new ArrayList<>();
            return objectMapper.readValue(json, new TypeReference<List<OrderRequest>>() {});
        } catch (Exception e) {
            throw new OmsException("DESERIALIZATION_ERROR", "Failed to deserialize basket orders");
        }
    }

    private BasketOrderResult executeBasket(String accountId, String basketName,
                                             boolean allOrNone, List<OrderRequest> orders) {
        BasketOrderResult result = new BasketOrderResult();
        result.setBasketName(basketName);
        result.setTotalOrders(orders.size());
        List<BasketOrderResult.OrderResult> resultList = new ArrayList<>();
        int accepted = 0, rejected = 0;
        for (int i = 0; i < orders.size(); i++) {
            OrderRequest req = orders.get(i);
            BasketOrderResult.OrderResult or = new BasketOrderResult.OrderResult();
            or.setIndex(i + 1);
            or.setSymbol(req.getSymbol());
            try {
                or.setOrder(orderService.submitOrder(req));
                or.setSuccess(true);
                accepted++;
            } catch (Exception e) {
                or.setSuccess(false);
                or.setErrorMessage(e.getMessage());
                rejected++;
                if (allOrNone) break;
            }
            resultList.add(or);
        }
        result.setAccepted(accepted);
        result.setRejected(rejected);
        result.setResults(resultList);
        return result;
    }
}
