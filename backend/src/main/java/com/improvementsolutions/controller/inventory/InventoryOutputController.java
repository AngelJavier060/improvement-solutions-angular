package com.improvementsolutions.controller.inventory;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

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
    public ResponseEntity<Map<String, Object>> create(@PathVariable String ruc, @RequestBody InventoryOutput output) {
        InventoryOutput created = outputService.create(ruc, output);
        return ResponseEntity.ok(Map.of(
            "id", created.getId(),
            "outputNumber", created.getOutputNumber(),
            "status", created.getStatus() != null ? created.getStatus().name() : null
        ));
    }
    
    /**
     * Listar todas las salidas
     * GET /api/inventory/{ruc}/outputs
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable String ruc) {
        List<InventoryOutput> outputs = outputService.list(ruc);
        List<Map<String, Object>> dto = new java.util.ArrayList<>();
        for (InventoryOutput o : outputs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("outputNumber", o.getOutputNumber());
            m.put("outputDate", o.getOutputDate());
            m.put("outputType", o.getOutputType() != null ? o.getOutputType().name() : null);
            m.put("employeeId", o.getEmployeeId());
            m.put("area", o.getArea());
            m.put("project", o.getProject());
            m.put("returnDate", o.getReturnDate());
            m.put("authorizedBy", o.getAuthorizedBy());
            m.put("documentImage", o.getDocumentImage());
            m.put("notes", o.getNotes());
            m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
            m.put("createdAt", o.getCreatedAt());
            m.put("updatedAt", o.getUpdatedAt());
            dto.add(m);
        }
        return ResponseEntity.ok(dto);
    }
    
    /**
     * Buscar salidas por rango de fechas
     * GET /api/inventory/{ruc}/outputs/search?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<Map<String, Object>>> searchByDateRange(
        @PathVariable String ruc,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<InventoryOutput> outputs = outputService.findByDateRange(ruc, startDate, endDate);
        List<Map<String, Object>> dto = new java.util.ArrayList<>();
        for (InventoryOutput o : outputs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("outputNumber", o.getOutputNumber());
            m.put("outputDate", o.getOutputDate());
            m.put("outputType", o.getOutputType() != null ? o.getOutputType().name() : null);
            m.put("employeeId", o.getEmployeeId());
            m.put("area", o.getArea());
            m.put("project", o.getProject());
            m.put("returnDate", o.getReturnDate());
            m.put("authorizedBy", o.getAuthorizedBy());
            m.put("documentImage", o.getDocumentImage());
            m.put("notes", o.getNotes());
            m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
            m.put("createdAt", o.getCreatedAt());
            m.put("updatedAt", o.getUpdatedAt());
            dto.add(m);
        }
        return ResponseEntity.ok(dto);
    }
    
    /**
     * Buscar salidas por tipo
     * GET /api/inventory/{ruc}/outputs/type/{outputType}
     */
    @GetMapping("/type/{outputType}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<Map<String, Object>>> findByType(
        @PathVariable String ruc,
        @PathVariable String outputType
    ) {
        List<InventoryOutput> outputs = outputService.findByType(ruc, outputType);
        List<Map<String, Object>> dto = new java.util.ArrayList<>();
        for (InventoryOutput o : outputs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("outputNumber", o.getOutputNumber());
            m.put("outputDate", o.getOutputDate());
            m.put("outputType", o.getOutputType() != null ? o.getOutputType().name() : null);
            m.put("employeeId", o.getEmployeeId());
            m.put("area", o.getArea());
            m.put("project", o.getProject());
            m.put("returnDate", o.getReturnDate());
            m.put("authorizedBy", o.getAuthorizedBy());
            m.put("documentImage", o.getDocumentImage());
            m.put("notes", o.getNotes());
            m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
            m.put("createdAt", o.getCreatedAt());
            m.put("updatedAt", o.getUpdatedAt());
            dto.add(m);
        }
        return ResponseEntity.ok(dto);
    }
    
    /**
     * Buscar salidas por trabajador
     * GET /api/inventory/{ruc}/outputs/employee/{employeeId}
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<Map<String, Object>>> findByEmployee(
        @PathVariable String ruc,
        @PathVariable Long employeeId
    ) {
        List<InventoryOutput> outputs = outputService.findByEmployee(ruc, employeeId);
        List<Map<String, Object>> dto = new java.util.ArrayList<>();
        for (InventoryOutput o : outputs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("outputNumber", o.getOutputNumber());
            m.put("outputDate", o.getOutputDate());
            m.put("outputType", o.getOutputType() != null ? o.getOutputType().name() : null);
            m.put("employeeId", o.getEmployeeId());
            m.put("area", o.getArea());
            m.put("project", o.getProject());
            m.put("returnDate", o.getReturnDate());
            m.put("authorizedBy", o.getAuthorizedBy());
            m.put("documentImage", o.getDocumentImage());
            m.put("notes", o.getNotes());
            m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
            m.put("createdAt", o.getCreatedAt());
            m.put("updatedAt", o.getUpdatedAt());
            dto.add(m);
        }
        return ResponseEntity.ok(dto);
    }

    /**
     * Actualizar documento (PDF/imagen) asociado a una salida
     * PATCH /api/inventory/{ruc}/outputs/{outputId}/document
     */
    @PatchMapping("/{outputId}/document")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<Map<String, Object>> updateDocument(
        @PathVariable String ruc,
        @PathVariable Long outputId,
        @RequestBody java.util.Map<String, String> body
    ) {
        String path = null;
        if (body != null) {
            path = body.get("documentPath");
            if (path == null || path.isBlank()) {
                path = body.get("documentImage");
            }
        }
        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("documentPath requerido");
        }
        InventoryOutput updated = outputService.updateDocumentImage(ruc, outputId, path);
        return ResponseEntity.ok(Map.of(
            "id", updated.getId(),
            "documentImage", updated.getDocumentImage(),
            "status", updated.getStatus() != null ? updated.getStatus().name() : null
        ));
    }

    /**
     * Confirmar una salida (procesa stock)
     * PATCH /api/inventory/{ruc}/outputs/{outputId}/confirm
     */
    @PatchMapping("/{outputId}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<Map<String, Object>> confirm(
        @PathVariable String ruc,
        @PathVariable Long outputId
    ) {
        InventoryOutput confirmed = outputService.confirm(ruc, outputId);
        return ResponseEntity.ok(Map.of(
            "id", confirmed.getId(),
            "outputNumber", confirmed.getOutputNumber(),
            "status", confirmed.getStatus() != null ? confirmed.getStatus().name() : null
        ));
    }
}
