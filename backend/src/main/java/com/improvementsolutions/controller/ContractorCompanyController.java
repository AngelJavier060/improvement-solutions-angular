package com.improvementsolutions.controller;

import com.improvementsolutions.dto.ContractorCompanyDto;
import com.improvementsolutions.service.ContractorCompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contractor-companies")
@RequiredArgsConstructor
public class ContractorCompanyController {

    private final ContractorCompanyService contractorCompanyService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<ContractorCompanyDto>> getAllCompanies() {
        List<ContractorCompanyDto> companies = contractorCompanyService.getAllCompanies();
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<ContractorCompanyDto>> getAllActiveCompanies() {
        List<ContractorCompanyDto> companies = contractorCompanyService.getAllActiveCompanies();
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<ContractorCompanyDto> getCompanyById(@PathVariable Long id) {
        return contractorCompanyService.getCompanyById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<ContractorCompanyDto>> searchCompaniesByName(@RequestParam String name) {
        List<ContractorCompanyDto> companies = contractorCompanyService.searchCompaniesByName(name);
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/by-name/{name}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<ContractorCompanyDto> getCompanyByName(@PathVariable String name) {
        return contractorCompanyService.getCompanyByName(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-code/{code}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<ContractorCompanyDto> getCompanyByCode(@PathVariable String code) {
        return contractorCompanyService.getCompanyByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createCompany(@RequestBody ContractorCompanyDto companyDto) {
        try {
            ContractorCompanyDto createdCompany = contractorCompanyService.createCompany(companyDto);
            return new ResponseEntity<>(createdCompany, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateCompany(@PathVariable Long id, @RequestBody ContractorCompanyDto companyDto) {
        try {
            return contractorCompanyService.updateCompany(id, companyDto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteCompany(@PathVariable Long id) {
        try {
            if (contractorCompanyService.deleteCompany(id)) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<String> toggleCompanyStatus(@PathVariable Long id) {
        if (contractorCompanyService.toggleCompanyStatus(id)) {
            return ResponseEntity.ok("Estado actualizado correctamente");
        }
        return ResponseEntity.notFound().build();
    }
}