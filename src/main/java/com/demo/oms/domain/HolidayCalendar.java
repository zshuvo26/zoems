package com.demo.oms.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "holiday_calendar", indexes = {
    @Index(name = "idx_holiday_date",     columnList = "date"),
    @Index(name = "idx_holiday_exchange", columnList = "exchange")
})
public class HolidayCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    // "DSE" | "CSE" | "ALL"
    @Column(nullable = false, length = 10)
    private String exchange = "ALL";

    @Column(nullable = false, length = 200)
    private String name;

    // PUBLIC | RELIGIOUS | MARKET_SPECIFIC | EMERGENCY
    @Column(length = 30)
    private String type = "PUBLIC";

    private boolean active = true;
}
