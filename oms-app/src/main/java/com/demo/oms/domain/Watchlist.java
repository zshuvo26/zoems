package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@Entity
@Table(name = "watchlists")
public class Watchlist {

    @Id
    private UUID id = UUID.randomUUID();

    private String accountId;
    private String name;           // e.g., "My Portfolio", "DSE Top 30"
    private String symbol;
    private String exchange;

    private String alertUpperPrice; // optional price alert threshold
    private String alertLowerPrice;

    private LocalDateTime addedAt = LocalDateTime.now();
}
