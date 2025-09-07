package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.dto.UserResponseDto;
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
@RequestMapping("/api/businesses")
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

    @GetMapping("/{id}/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Business> getBusinessAdminDetails(@PathVariable Long id) {
        Business business = businessService.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        // El objeto Business ya incluye todas las relaciones gracias a las anotaciones JPA
        // usuarios, empleados, obligaciones, etc.
        return ResponseEntity.ok(business);
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

    @PostMapping("/ruc/{ruc}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> addUserToBusinessByRuc(
            @PathVariable String ruc,
            @PathVariable Long userId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con RUC: " + ruc));
        businessService.addUserToBusiness(business.getId(), userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{businessId}/users")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserResponseDto>> getUsersByBusiness(@PathVariable Long businessId) {
        Business business = businessService.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        return ResponseEntity.ok(UserResponseDto.fromUsers(business.getUsers()));
    }

    @GetMapping("/available-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAvailableUsers() {
        return ResponseEntity.ok(businessService.getAllUsers());
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

    // === ENDPOINTS PARA DEPARTAMENTOS ===
    @PostMapping("/{businessId}/departments/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addDepartmentToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long departmentId) {
        
        businessService.addDepartmentToBusiness(businessId, departmentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Departamento agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/departments/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> removeDepartmentFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long departmentId) {
        
        businessService.removeDepartmentFromBusiness(businessId, departmentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Departamento eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA CARGOS ===
    @PostMapping("/{businessId}/positions/{positionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addPositionToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long positionId) {
        
        businessService.addPositionToBusiness(businessId, positionId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cargo agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/positions/{positionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> removePositionFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long positionId) {
        
        businessService.removePositionFromBusiness(businessId, positionId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cargo eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA TIPOS DE DOCUMENTO ===
    @PostMapping("/{businessId}/type-documents/{typeDocumentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addTypeDocumentToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeDocumentId) {
        
        businessService.addTypeDocumentToBusiness(businessId, typeDocumentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de documento agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/type-documents/{typeDocumentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> removeTypeDocumentFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeDocumentId) {
        
        businessService.removeTypeDocumentFromBusiness(businessId, typeDocumentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de documento eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA TIPOS DE CONTRATO ===
    @PostMapping("/{businessId}/type-contracts/{typeContractId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addTypeContractToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeContractId) {
        
        businessService.addTypeContractToBusiness(businessId, typeContractId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de contrato agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/type-contracts/{typeContractId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> removeTypeContractFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeContractId) {
        
        businessService.removeTypeContractFromBusiness(businessId, typeContractId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de contrato eliminado exitosamente");
        return ResponseEntity.ok(response);
    }
}
