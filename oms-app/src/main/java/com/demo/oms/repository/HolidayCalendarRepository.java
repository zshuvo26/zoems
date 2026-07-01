package com.demo.oms.repository;

import com.demo.oms.domain.HolidayCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HolidayCalendarRepository extends JpaRepository<HolidayCalendar, Long> {

    @Query("SELECT h FROM HolidayCalendar h WHERE h.date = :date AND h.active = true AND (h.exchange = :exchange OR h.exchange = 'ALL')")
    List<HolidayCalendar> findByDateAndExchange(@Param("date") LocalDate date, @Param("exchange") String exchange);

    List<HolidayCalendar> findByDateBetweenAndActiveTrueOrderByDateAsc(LocalDate from, LocalDate to);

    List<HolidayCalendar> findByActiveTrue();
}
