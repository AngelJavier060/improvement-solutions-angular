package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessEmployeeContract;
import com.improvementsolutions.service.BusinessEmployeeContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class BusinessEmployeeContractController {

    private final BusinessEmployeeContractService contractService;

    @GetMapping("/employee/{businessEmployeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeContract>> getContractsByEmployee(@PathVariable Long businessEmployeeId) {
        List<BusinessEmployeeContract> contracts = contractService.findByBusinessEmployeeId(businessEmployeeId);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeContract> getContractById(@PathVariable Long id) {
        return contractService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeContract>> getContractsByBusiness(@PathVariable Long businessId) {
        List<BusinessEmployeeContract> contracts = contractService.findByBusinessId(businessId);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/business/{businessId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeContract>> getContractsByBusinessAndStatus(
            @PathVariable Long businessId,
            @PathVariable String status) {
        List<BusinessEmployeeContract> contracts = contractService.findByBusinessIdAndStatus(businessId, status);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/business/{businessId}/expiring")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeContract>> getContractsExpiringSoon(
            @PathVariable Long businessId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<BusinessEmployeeContract> contracts = contractService.findContractsExpiringSoon(businessId, startDate, endDate);
        return ResponseEntity.ok(contracts);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeContract> createContract(@RequestBody BusinessEmployeeContract contract) {
        BusinessEmployeeContract createdContract = contractService.create(contract);
        return new ResponseEntity<>(createdContract, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeContract> updateContract(
            @PathVariable Long id,
            @RequestBody BusinessEmployeeContract contract) {
        BusinessEmployeeContract updatedContract = contractService.update(id, contract);
        return ResponseEntity.ok(updatedContract);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteContract(@PathVariable Long id) {
        contractService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> updateContractStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        contractService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{contractId}/employee/{businessEmployeeId}/current")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> setAsCurrentContract(
            @PathVariable Long contractId,
            @PathVariable Long businessEmployeeId) {
        contractService.setAsCurrentContract(contractId, businessEmployeeId);
        return ResponseEntity.ok().build();
    }
}