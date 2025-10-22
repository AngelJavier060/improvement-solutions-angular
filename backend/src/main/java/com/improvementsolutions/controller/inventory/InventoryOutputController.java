package com.improvementsolutions.controller.inventory;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryOutput;
import com.improvementsolutions.service.inventory.InventoryOutputService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/{ruc}/outputs")
@RequiredArgsConstructor
public class InventoryOutputController {
    
    private final InventoryOutputService outputService;
    
    /**
     * Crear nueva salida de inventario
     * POST /api/inventory/{ruc}/outputs
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<InventoryOutput> create(@PathVariable String ruc, @RequestBody InventoryOutput output) {
        InventoryOutput created = outputService.create(ruc, output);
        return ResponseEntity.ok(created);
    }
    
    /**
     * Listar todas las salidas
     * GET /api/inventory/{ruc}/outputs
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryOutput>> list(@PathVariable String ruc) {
        List<InventoryOutput> outputs = outputService.list(ruc);
        return ResponseEntity.ok(outputs);
    }
    
    /**
     * Buscar salidas por rango de fechas
     * GET /api/inventory/{ruc}/outputs/search?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryOutput>> searchByDateRange(
        @PathVariable String ruc,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<InventoryOutput> outputs = outputService.findByDateRange(ruc, startDate, endDate);
        return ResponseEntity.ok(outputs);
    }
    
    /**
     * Buscar salidas por tipo
     * GET /api/inventory/{ruc}/outputs/type/{outputType}
     */
    @GetMapping("/type/{outputType}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryOutput>> findByType(
        @PathVariable String ruc,
        @PathVariable String outputType
    ) {
        List<InventoryOutput> outputs = outputService.findByType(ruc, outputType);
        return ResponseEntity.ok(outputs);
    }
    
    /**
     * Buscar salidas por trabajador
     * GET /api/inventory/{ruc}/outputs/employee/{employeeId}
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryOutput>> findByEmployee(
        @PathVariable String ruc,
        @PathVariable Long employeeId
    ) {
        List<InventoryOutput> outputs = outputService.findByEmployee(ruc, employeeId);
        return ResponseEntity.ok(outputs);
    }
}
