package com.improvementsolutions.controller.inventory;

import java.time.LocalDate;
import java.util.List;

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
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<InventoryEntry> create(@PathVariable String ruc, @RequestBody InventoryEntry entry) {
        InventoryEntry created = entryService.create(ruc, entry);
        return ResponseEntity.ok(created);
    }
    
    /**
     * Listar todas las entradas
     * GET /api/inventory/{ruc}/entries
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryEntry>> list(@PathVariable String ruc) {
        List<InventoryEntry> entries = entryService.list(ruc);
        return ResponseEntity.ok(entries);
    }
    
    /**
     * Buscar entradas por rango de fechas
     * GET /api/inventory/{ruc}/entries/search?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
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
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
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
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryMovement>> getKardex(
        @PathVariable String ruc,
        @PathVariable Long variantId
    ) {
        List<InventoryMovement> kardex = entryService.getKardex(ruc, variantId);
        return ResponseEntity.ok(kardex);
    }
}
