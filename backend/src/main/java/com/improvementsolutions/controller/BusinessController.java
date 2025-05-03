package com.improvementsolutions.controller;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.service.BusinessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<Business>> getAllBusinesses() {
        List<Business> businesses = businessService.findAll();
        return ResponseEntity.ok(businesses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Business> getBusinessById(@PathVariable Long id) {
        return businessService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/byUser/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<Business>> getBusinessesByUserId(@PathVariable Long userId) {
        List<Business> businesses = businessService.findByUserId(userId);
        return ResponseEntity.ok(businesses);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Business> createBusiness(@RequestBody Business business) {
        Business createdBusiness = businessService.create(business);
        return new ResponseEntity<>(createdBusiness, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Business> updateBusiness(@PathVariable Long id, @RequestBody Business business) {
        Business updatedBusiness = businessService.update(id, business);
        return ResponseEntity.ok(updatedBusiness);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBusiness(@PathVariable Long id) {
        businessService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{businessId}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> addUserToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long userId) {
        businessService.addUserToBusiness(businessId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{businessId}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeUserFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long userId) {
        businessService.removeUserFromBusiness(businessId, userId);
        return ResponseEntity.ok().build();
    }

    // Endpoints públicos
    @GetMapping("/public/search")
    public ResponseEntity<List<Business>> searchBusinessesByName(@RequestParam String name) {
        List<Business> businesses = businessService.findByName(name);
        return ResponseEntity.ok(businesses);
    }

    @GetMapping("/public/ruc/{ruc}")
    public ResponseEntity<Business> getBusinessByRuc(@PathVariable String ruc) {
        return businessService.findByRuc(ruc)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}