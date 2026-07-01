package com.demo.oms.service;

import com.demo.oms.domain.HolidayCalendar;
import com.demo.oms.repository.HolidayCalendarRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
public class HolidayCalendarService {

    @Autowired private HolidayCalendarRepository holidayRepo;

    public boolean isHoliday(LocalDate date, String exchange) {
        List<HolidayCalendar> holidays = holidayRepo.findByDateAndExchange(date, exchange);
        return !holidays.isEmpty();
    }

    public List<HolidayCalendar> getHolidays(LocalDate from, LocalDate to) {
        return holidayRepo.findByDateBetweenAndActiveTrueOrderByDateAsc(from, to);
    }

    public List<HolidayCalendar> getAllActive() {
        return holidayRepo.findByActiveTrue();
    }

    @Transactional
    public HolidayCalendar add(HolidayCalendar holiday) {
        return holidayRepo.save(holiday);
    }

    @Transactional
    public void deactivate(Long id) {
        holidayRepo.findById(id).ifPresent(h -> {
            h.setActive(false);
            holidayRepo.save(h);
        });
    }

    @Transactional
    public void delete(Long id) {
        holidayRepo.deleteById(id);
    }
}
