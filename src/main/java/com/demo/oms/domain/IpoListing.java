package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "ipo_listings")
public class IpoListing {

    @Id
    private String ipoId; // e.g. "NEWCO-2026-IPO"

    private String symbol;
    private String companyName;
    private String sector;

    @Column(precision = 19, scale = 4)
    private BigDecimal issuePrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal faceValue = new BigDecimal("10.00");

    private int lotSize = 100;         // shares per lot
    private int minLots = 1;
    private int maxLots = 20;

    private long totalSharesOnOffer;

    private LocalDate subscriptionOpen;
    private LocalDate subscriptionClose;
    private LocalDate allotmentDate;
    private LocalDate listingDate;

    // OPEN, CLOSED, ALLOTMENT_PENDING, LISTED, CANCELLED
    private String status = "OPEN";

    @Column(length = 1000)
    private String prospectusUrl;

    private LocalDateTime createdAt = LocalDateTime.now();
}
