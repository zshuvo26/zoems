package com.demo.oms.controller;

import com.demo.oms.domain.HolidayCalendar;
import com.demo.oms.dto.ApiResponse;
import com.demo.oms.service.HolidayCalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Holiday Calendar", description = "Market holiday management for DSE/CSE")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/holidays")
public class HolidayController {

    @Autowired private HolidayCalendarService holidayService;

    @Operation(summary = "List all active holidays")
    @GetMapping
    public ResponseEntity<ApiResponse<List<HolidayCalendar>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(holidayService.getAllActive()));
    }

    @Operation(summary = "List holidays in a date range")
    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<HolidayCalendar>>> range(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(holidayService.getHolidays(from, to)));
    }

    @Operation(summary = "Check if a specific date is a holiday")
    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Boolean>> check(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "ALL") String exchange) {
        return ResponseEntity.ok(ApiResponse.ok(holidayService.isHoliday(date, exchange)));
    }

    @Operation(summary = "Add a new holiday (ADMIN only)")
    @PostMapping
    public ResponseEntity<ApiResponse<HolidayCalendar>> add(@RequestBody HolidayCalendar holiday) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Holiday added", holidayService.add(holiday)));
    }

    @Operation(summary = "Delete a holiday entry")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        holidayService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Holiday deleted", null));
    }
}
