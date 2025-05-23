package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.service.BusinessEmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/business-employees")
@RequiredArgsConstructor
public class BusinessEmployeeController {

    private final BusinessEmployeeService businessEmployeeService;

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployee>> getEmployeesByBusiness(@PathVariable Long businessId) {
        List<BusinessEmployee> employees = businessEmployeeService.findByBusinessId(businessId);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployee> getEmployeeById(@PathVariable Long id) {
        return businessEmployeeService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/business/{businessId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployee>> getEmployeesByBusinessAndStatus(
            @PathVariable Long businessId, 
            @PathVariable String status) {
        List<BusinessEmployee> employees = businessEmployeeService.findByBusinessIdAndStatus(businessId, status);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/business/{businessId}/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployee>> searchEmployees(
            @PathVariable Long businessId,
            @RequestParam String searchTerm) {
        List<BusinessEmployee> employees = businessEmployeeService.searchByBusinessIdAndNameOrCedula(businessId, searchTerm);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/business/{businessId}/cedula/{cedula}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployee> getEmployeeByCedula(
            @PathVariable Long businessId,
            @PathVariable String cedula) {
        return businessEmployeeService.findByBusinessIdAndCedula(businessId, cedula)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployee> createEmployee(@RequestBody BusinessEmployee employee) {
        BusinessEmployee createdEmployee = businessEmployeeService.create(employee);
        return new ResponseEntity<>(createdEmployee, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployee> updateEmployee(
            @PathVariable Long id, 
            @RequestBody BusinessEmployee employee) {
        BusinessEmployee updatedEmployee = businessEmployeeService.update(id, employee);
        return ResponseEntity.ok(updatedEmployee);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        businessEmployeeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> updateEmployeeStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        businessEmployeeService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }
}
