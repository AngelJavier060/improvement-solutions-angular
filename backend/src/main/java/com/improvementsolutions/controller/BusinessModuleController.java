package com.improvementsolutions.controller;

import com.improvementsolutions.dto.BusinessModuleDto;
import com.improvementsolutions.model.SystemModule;
import com.improvementsolutions.service.BusinessModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/business-modules")
@RequiredArgsConstructor
public class BusinessModuleController {

    private final BusinessModuleService businessModuleService;

    // ─── Catálogo de módulos del sistema ─────────────────────────────

    @GetMapping("/system-modules")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<SystemModule>> getAllSystemModules() {
        return ResponseEntity.ok(businessModuleService.getAllSystemModules());
    }

    // ─── Módulos por empresa (SUPER_ADMIN ve todos, con estado) ─────

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<BusinessModuleDto>> getModulesByBusiness(@PathVariable Long businessId) {
        return ResponseEntity.ok(businessModuleService.getModulesByBusinessId(businessId));
    }

    // ─── Activar / Desactivar módulo (toggle) ───────────────────────

    @PostMapping("/business/{businessId}/module/{moduleId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BusinessModuleDto> toggleModule(
            @PathVariable Long businessId,
            @PathVariable Long moduleId,
            @RequestBody Map<String, Object> body) {

        boolean active = body.get("active") != null && Boolean.parseBoolean(body.get("active").toString());
        LocalDate startDate = parseDate(body.get("startDate"));
        LocalDate expirationDate = parseDate(body.get("expirationDate"));
        String notes = body.get("notes") != null ? body.get("notes").toString() : null;

        BusinessModuleDto dto = businessModuleService.toggleModule(
                businessId, moduleId, active, startDate, expirationDate, notes);
        return ResponseEntity.ok(dto);
    }

    // ─── Actualizar un registro existente ────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BusinessModuleDto> updateModule(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Boolean active = body.get("active") != null ? Boolean.parseBoolean(body.get("active").toString()) : null;
        LocalDate startDate = parseDate(body.get("startDate"));
        LocalDate expirationDate = parseDate(body.get("expirationDate"));
        String notes = body.get("notes") != null ? body.get("notes").toString() : null;

        BusinessModuleDto dto = businessModuleService.updateModule(id, active, startDate, expirationDate, notes);
        return ResponseEntity.ok(dto);
    }

    // ─── Endpoint para usuarios normales: módulos activos por RUC ───

    @GetMapping("/active/{ruc}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessModuleDto>> getActiveModulesByRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(businessModuleService.getEffectiveModulesByRuc(ruc));
    }

    // ─── Verificar si un módulo específico está activo ───────────────

    @GetMapping("/check/{ruc}/{moduleCode}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<Map<String, Boolean>> checkModuleActive(
            @PathVariable String ruc, @PathVariable String moduleCode) {
        boolean isActive = businessModuleService.isModuleActiveForBusiness(ruc, moduleCode);
        return ResponseEntity.ok(Map.of("active", isActive));
    }

    // ─── Helper ─────────────────────────────────────────────────────

    private LocalDate parseDate(Object value) {
        if (value == null || value.toString().isBlank()) return null;
        return LocalDate.parse(value.toString());
    }
}
