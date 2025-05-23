package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.service.BusinessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/businesses") // IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;
    
    // Endpoints para el administrador
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalBusinesses", businessService.countActiveBusinesses());
        dashboard.put("recentBusinesses", businessService.findByRegistrationDateRange(
            LocalDateTime.now().minusDays(30), LocalDateTime.now()));
        dashboard.put("activeBusinesses", businessService.findAllActiveBusinesses());
        return ResponseEntity.ok(dashboard);
    }
    
    @GetMapping("/admin/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Business>> searchBusinesses(@RequestParam String term) {
        return ResponseEntity.ok(businessService.searchBusinesses(term));
    }
    
    @PutMapping("/admin/{businessId}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> toggleBusinessStatus(@PathVariable Long businessId) {
        businessService.toggleBusinessStatus(businessId);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/admin/{businessId}/configurations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Business> updateBusinessConfigurations(
            @PathVariable Long businessId,
            @RequestBody Map<String, Object> configurations) {
        
        Business business = businessService.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        try {
            @SuppressWarnings("unchecked")
            Set<Department> departments = configurations.get("departments") != null ? 
                (Set<Department>) configurations.get("departments") : 
                business.getDepartments();
            
            @SuppressWarnings("unchecked")
            Set<Iess> iessItems = configurations.get("iessItems") != null ? 
                (Set<Iess>) configurations.get("iessItems") : 
                business.getIessItems();
            
            @SuppressWarnings("unchecked")
            Set<Position> positions = configurations.get("positions") != null ? 
                (Set<Position>) configurations.get("positions") : 
                business.getPositions();
            
            Business updatedBusiness = businessService.updateBusinessConfigurations(
                businessId, 
                departments, 
                iessItems, 
                positions
            );
            
            return ResponseEntity.ok(updatedBusiness);
        } catch (ClassCastException e) {
            throw new RuntimeException("Error al procesar las configuraciones: " + e.getMessage());
        }
    }

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
