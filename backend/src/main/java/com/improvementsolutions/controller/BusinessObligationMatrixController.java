package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.dto.ComplianceSummaryDTO;
import com.improvementsolutions.model.BusinessObligationMatrixVersion;
import com.improvementsolutions.service.BusinessObligationMatrixService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/obligation-matrices")
@RequiredArgsConstructor
public class BusinessObligationMatrixController {

    private final BusinessObligationMatrixService matrixService;

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrix>> getMatricesByBusiness(@PathVariable Long businessId) {
        List<BusinessObligationMatrix> matrices = matrixService.findByBusinessId(businessId);
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(matrices);
    }

    // Resumen de cumplimiento para velocímetro
    @GetMapping("/business/{businessId}/compliance-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<ComplianceSummaryDTO> getComplianceSummary(@PathVariable Long businessId) {
        ComplianceSummaryDTO summary = matrixService.getComplianceSummary(businessId);
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(summary);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<BusinessObligationMatrix> getMatrixById(@PathVariable Long id) {
        return matrixService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/business/{businessId}/status/{status}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrix>> getMatricesByBusinessAndStatus(
            @PathVariable Long businessId,
            @PathVariable String status) {
        List<BusinessObligationMatrix> matrices = matrixService.findByBusinessIdAndStatus(businessId, status);
        return ResponseEntity.ok(matrices);
    }

    @GetMapping("/business/{businessId}/due-date-range")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrix>> getMatricesWithDueDateInRange(
            @PathVariable Long businessId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<BusinessObligationMatrix> matrices = matrixService.findObligationsWithDueDateInRange(
                businessId, startDate, endDate);
        return ResponseEntity.ok(matrices);
    }

    @GetMapping("/business/{businessId}/search")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrix>> searchMatrices(
            @PathVariable Long businessId,
            @RequestParam String searchTerm) {
        List<BusinessObligationMatrix> matrices = matrixService.searchByNameOrDescription(businessId, searchTerm);
        return ResponseEntity.ok(matrices);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<BusinessObligationMatrix> createMatrix(@RequestBody BusinessObligationMatrix matrix) {
        BusinessObligationMatrix createdMatrix = matrixService.create(matrix);
        return new ResponseEntity<>(createdMatrix, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<BusinessObligationMatrix> updateMatrix(
            @PathVariable Long id,
            @RequestBody BusinessObligationMatrix matrix) {
        BusinessObligationMatrix updatedMatrix = matrixService.update(id, matrix);
        return ResponseEntity.ok(updatedMatrix);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteMatrix(@PathVariable Long id) {
        matrixService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<Void> updateMatrixStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        matrixService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }

    // Crear relación por empresa y catálogo con datos opcionales
    @PostMapping("/business/{businessId}/catalog/{obligationMatrixId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<BusinessObligationMatrix> createForBusinessAndCatalog(
            @PathVariable Long businessId,
            @PathVariable Long obligationMatrixId,
            @RequestBody(required = false) BusinessObligationMatrix details) {
        BusinessObligationMatrix created = matrixService.createForBusinessAndCatalog(businessId, obligationMatrixId, details);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // Marcar como cumplida/no cumplida
    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<Void> markCompletion(
            @PathVariable Long id,
            @RequestParam boolean completed) {
        matrixService.markCompletion(id, completed);
        return ResponseEntity.ok().build();
    }

    // Renovación (nueva versión) con posibilidad de enviar nuevos detalles
    @PostMapping("/{id}/renew")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<BusinessObligationMatrix> renew(
            @PathVariable Long id,
            @RequestBody(required = false) BusinessObligationMatrix details
    ) {
        BusinessObligationMatrix renewed = matrixService.renew(id, details);
        return ResponseEntity.ok(renewed);
    }

    // Listar historial de versiones
    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrixVersion>> listVersions(@PathVariable Long id) {
        return ResponseEntity.ok(matrixService.listVersions(id));
    }
}
