package com.improvementsolutions.controller;

import com.improvementsolutions.dto.EmployeeHistoryItemDto;
import com.improvementsolutions.service.EmployeeHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
public class EmployeeHistoryController {

    private final EmployeeHistoryService employeeHistoryService;

    @GetMapping("/employee-history/by-ruc/{ruc}")
    public ResponseEntity<List<EmployeeHistoryItemDto>> getByBusinessRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(employeeHistoryService.findHistoricByBusinessRuc(ruc));
    }
}
