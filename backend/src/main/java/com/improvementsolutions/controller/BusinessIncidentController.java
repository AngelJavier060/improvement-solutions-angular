package com.improvementsolutions.controller;

import com.improvementsolutions.dto.BusinessIncidentDto;
import com.improvementsolutions.service.BusinessIncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class BusinessIncidentController {

    private final BusinessIncidentService incidentService;

    // ── GET /api/incidents/business/{ruc} ────────────────────────────────
    @GetMapping("/business/{ruc}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<BusinessIncidentDto>> getByRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(incidentService.findByRuc(ruc));
    }

    // ── GET /api/incidents/{id} ──────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<BusinessIncidentDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(incidentService.findById(id));
    }

    // ── POST /api/incidents/business/{ruc} ───────────────────────────────
    @PostMapping("/business/{ruc}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<BusinessIncidentDto> create(
            @PathVariable String ruc,
            @RequestBody BusinessIncidentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incidentService.create(ruc, dto));
    }

    // ── PUT /api/incidents/{id} ──────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<BusinessIncidentDto> update(
            @PathVariable Long id,
            @RequestBody BusinessIncidentDto dto) {
        return ResponseEntity.ok(incidentService.update(id, dto));
    }

    // ── PATCH /api/incidents/{id}/status ────────────────────────────────
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<BusinessIncidentDto> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(incidentService.updateStatus(id, status));
    }

    // ── DELETE /api/incidents/{id} ───────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        incidentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── GET /api/incidents/business/{ruc}/stats ──────────────────────────
    @GetMapping("/business/{ruc}/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<Map<String, Long>> getStats(@PathVariable String ruc) {
        return ResponseEntity.ok(incidentService.getStatsForBusiness(ruc));
    }

    // ── GET /api/incidents/business/{ruc}/safety ── Solo Salud y Seguridad
    @GetMapping("/business/{ruc}/safety")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<BusinessIncidentDto>> getSafetyByRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(incidentService.findSafetyByRuc(ruc));
    }

    // ── GET /api/incidents/business/{ruc}/safety/range?from=&to= ──────────
    @GetMapping("/business/{ruc}/safety/range")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<BusinessIncidentDto>> getSafetyByRucAndRange(
            @PathVariable String ruc,
            @RequestParam String from,
            @RequestParam String to) {
        return ResponseEntity.ok(incidentService.findSafetyByRucAndDateRange(
                ruc,
                java.time.LocalDate.parse(from),
                java.time.LocalDate.parse(to)));
    }

    // ── GET /api/incidents/business/{ruc}/safety/cedula/{cedula}?from=&to= ─
    @GetMapping("/business/{ruc}/safety/cedula/{cedula}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<BusinessIncidentDto>> getSafetyByCedula(
            @PathVariable String ruc,
            @PathVariable String cedula,
            @RequestParam String from,
            @RequestParam String to) {
        return ResponseEntity.ok(incidentService.findSafetyByCedulaAndDateRange(
                ruc, cedula,
                java.time.LocalDate.parse(from),
                java.time.LocalDate.parse(to)));
    }
}
