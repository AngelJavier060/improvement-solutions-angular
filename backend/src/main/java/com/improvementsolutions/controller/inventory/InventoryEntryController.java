package com.improvementsolutions.controller.inventory;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryEntry;
import com.improvementsolutions.model.inventory.InventoryMovement;
import com.improvementsolutions.service.inventory.InventoryEntryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/{ruc}/entries")
@RequiredArgsConstructor
public class InventoryEntryController {
    
    private final InventoryEntryService entryService;
    
    /**
     * Crear nueva entrada de inventario
     * POST /api/inventory/{ruc}/entries
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<InventoryEntry> create(@PathVariable String ruc, @RequestBody InventoryEntry entry) {
        InventoryEntry created = entryService.create(ruc, entry);
        return ResponseEntity.ok(created);
    }
    
    /**
     * Tipos de entrada asignados a la empresa (Inventario-Bodega).
     * GET /api/inventory/{ruc}/entries/types
     */
    @GetMapping("/types")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> entryTypes(@PathVariable String ruc) {
        return ResponseEntity.ok(entryService.listEntryTypesForBusiness(ruc));
    }

    /**
     * Siguiente número de entrada consecutivo del año: ENT-2026-0001
     * GET /api/inventory/{ruc}/entries/next-number
     */
    @GetMapping("/next-number")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<Map<String, String>> nextNumber(@PathVariable String ruc) {
        String number = entryService.nextEntryNumber(ruc);
        return ResponseEntity.ok(Map.of("entryNumber", number));
    }

    /**
     * Listar todas las entradas
     * GET /api/inventory/{ruc}/entries
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<InventoryEntry>> list(@PathVariable String ruc) {
        List<InventoryEntry> entries = entryService.list(ruc);
        return ResponseEntity.ok(entries);
    }
    
    /**
     * Buscar entradas por rango de fechas
     * GET /api/inventory/{ruc}/entries/search?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<InventoryEntry>> searchByDateRange(
        @PathVariable String ruc,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<InventoryEntry> entries = entryService.findByDateRange(ruc, startDate, endDate);
        return ResponseEntity.ok(entries);
    }
    
    /**
     * Buscar entradas por proveedor
     * GET /api/inventory/{ruc}/entries/supplier/{supplierId}
     */
    @GetMapping("/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<InventoryEntry>> findBySupplier(
        @PathVariable String ruc,
        @PathVariable Long supplierId
    ) {
        List<InventoryEntry> entries = entryService.findBySupplier(ruc, supplierId);
        return ResponseEntity.ok(entries);
    }
    
    /**
     * Obtener Kardex (historial de movimientos) de una variante
     * GET /api/inventory/{ruc}/entries/kardex/{variantId}
     */
    @GetMapping("/kardex/{variantId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<InventoryMovement>> getKardex(
        @PathVariable String ruc,
        @PathVariable Long variantId
    ) {
        List<InventoryMovement> kardex = entryService.getKardex(ruc, variantId);
        return ResponseEntity.ok(kardex);
    }

    /**
     * Confirmar una entrada (afecta stock / costeo / kardex)
     * PATCH /api/inventory/{ruc}/entries/{entryId}/confirm
     */
    @PatchMapping("/{entryId}/confirm")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> confirm(
        @PathVariable String ruc,
        @PathVariable Long entryId
    ) {
        InventoryEntry confirmed = entryService.confirm(ruc, entryId);
        return ResponseEntity.ok(Map.of(
            "id", confirmed.getId(),
            "entryNumber", confirmed.getEntryNumber(),
            "status", confirmed.getStatus() != null ? confirmed.getStatus().name() : null
        ));
    }

    /**
     * Anular entrada en BORRADOR
     * PATCH /api/inventory/{ruc}/entries/{entryId}/cancel
     */
    @PatchMapping("/{entryId}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> cancel(
        @PathVariable String ruc,
        @PathVariable Long entryId
    ) {
        InventoryEntry cancelled = entryService.cancel(ruc, entryId);
        return ResponseEntity.ok(Map.of(
            "id", cancelled.getId(),
            "entryNumber", cancelled.getEntryNumber(),
            "status", cancelled.getStatus() != null ? cancelled.getStatus().name() : null
        ));
    }
}
