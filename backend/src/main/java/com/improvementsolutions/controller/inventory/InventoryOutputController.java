package com.improvementsolutions.controller.inventory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryOutput;
import com.improvementsolutions.model.inventory.InventoryOutputDetail;
import com.improvementsolutions.service.inventory.InventoryOutputService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/{ruc}/outputs")
@RequiredArgsConstructor
public class InventoryOutputController {
    
    private final InventoryOutputService outputService;
    
    /**
     * Siguiente número de salida consecutivo del año: SAL-2026-0001
     * GET /api/inventory/{ruc}/outputs/next-number
     */
    @GetMapping("/next-number")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<Map<String, String>> nextNumber(@PathVariable String ruc) {
        String number = outputService.nextOutputNumber(ruc);
        return ResponseEntity.ok(Map.of("outputNumber", number));
    }

    /**
     * Crear nueva salida de inventario
     * POST /api/inventory/{ruc}/outputs
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable String ruc) {
        List<InventoryOutput> outputs = outputService.list(ruc);
        return ResponseEntity.ok(toDtoList(outputs));
    }
    
    /**
     * Buscar salidas por rango de fechas
     * GET /api/inventory/{ruc}/outputs/search?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<Map<String, Object>>> searchByDateRange(
        @PathVariable String ruc,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<InventoryOutput> outputs = outputService.findByDateRange(ruc, startDate, endDate);
        return ResponseEntity.ok(toDtoList(outputs));
    }
    
    /**
     * Tipos de salida asignados a la empresa
     * GET /api/inventory/{ruc}/outputs/types
     */
    @GetMapping("/types")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<Map<String, Object>>> outputTypes(@PathVariable String ruc) {
        return ResponseEntity.ok(outputService.listOutputTypesForBusiness(ruc));
    }

    /**
     * Buscar salidas por tipo
     * GET /api/inventory/{ruc}/outputs/type/{outputType}
     */
    @GetMapping("/type/{outputType}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<Map<String, Object>>> findByType(
        @PathVariable String ruc,
        @PathVariable String outputType
    ) {
        List<InventoryOutput> outputs = outputService.findByType(ruc, outputType);
        return ResponseEntity.ok(toDtoList(outputs));
    }
    
    /**
     * Buscar salidas por trabajador
     * GET /api/inventory/{ruc}/outputs/employee/{employeeId}
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<List<Map<String, Object>>> findByEmployee(
        @PathVariable String ruc,
        @PathVariable Long employeeId
    ) {
        List<InventoryOutput> outputs = outputService.findByEmployee(ruc, employeeId);
        return ResponseEntity.ok(toDtoList(outputs));
    }

    /**
     * Actualizar documento (PDF/imagen) asociado a la salida
     * PATCH /api/inventory/{ruc}/outputs/{outputId}/document
     */
    @PatchMapping("/{outputId}/document")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
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

    /**
     * Marcar salida/préstamo como ya devuelto
     * PATCH /api/inventory/{ruc}/outputs/{outputId}/returned
     */
    @PatchMapping("/{outputId}/returned")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> markReturned(
        @PathVariable String ruc,
        @PathVariable Long outputId,
        @RequestBody(required = false) Map<String, Object> body
    ) {
        Long returnEntryId = null;
        if (body != null && body.get("returnEntryId") != null) {
            returnEntryId = Long.valueOf(String.valueOf(body.get("returnEntryId")));
        }
        InventoryOutput updated = outputService.markReturned(ruc, outputId, returnEntryId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", updated.getId());
        res.put("outputNumber", updated.getOutputNumber());
        res.put("returned", Boolean.TRUE.equals(updated.getReturned()));
        res.put("returnEntryId", updated.getReturnEntryId());
        return ResponseEntity.ok(res);
    }

    /**
     * Anular salida en BORRADOR
     * PATCH /api/inventory/{ruc}/outputs/{outputId}/cancel
     */
    @PatchMapping("/{outputId}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> cancel(
        @PathVariable String ruc,
        @PathVariable Long outputId
    ) {
        InventoryOutput cancelled = outputService.cancel(ruc, outputId);
        return ResponseEntity.ok(Map.of(
            "id", cancelled.getId(),
            "outputNumber", cancelled.getOutputNumber(),
            "status", cancelled.getStatus() != null ? cancelled.getStatus().name() : null
        ));
    }

    private List<Map<String, Object>> toDtoList(List<InventoryOutput> outputs) {
        List<Map<String, Object>> dto = new ArrayList<>();
        for (InventoryOutput o : outputs) {
            dto.add(toDto(o));
        }
        return dto;
    }

    private Map<String, Object> toDto(InventoryOutput o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("outputNumber", o.getOutputNumber());
        m.put("outputDate", o.getOutputDate());
        m.put("outputType", o.getOutputType());
        m.put("employeeId", o.getEmployeeId());
        m.put("area", o.getArea());
        m.put("project", o.getProject());
        m.put("returnDate", o.getReturnDate());
        m.put("returned", Boolean.TRUE.equals(o.getReturned()));
        m.put("returnedAt", o.getReturnedAt());
        m.put("returnEntryId", o.getReturnEntryId());
        m.put("authorizedBy", o.getAuthorizedBy());
        m.put("documentImage", o.getDocumentImage());
        m.put("notes", o.getNotes());
        m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
        m.put("createdAt", o.getCreatedAt());
        m.put("updatedAt", o.getUpdatedAt());

        List<Map<String, Object>> details = new ArrayList<>();
        if (o.getDetails() != null) {
            for (InventoryOutputDetail d : o.getDetails()) {
                Map<String, Object> dm = new LinkedHashMap<>();
                dm.put("id", d.getId());
                Long variantId = d.getVariant() != null ? d.getVariant().getId() : null;
                dm.put("variantId", variantId);
                dm.put("variantCode", d.getVariant() != null ? d.getVariant().getCode() : null);
                String productName = null;
                try {
                    if (d.getVariant() != null && d.getVariant().getProduct() != null) {
                        productName = d.getVariant().getProduct().getName();
                    }
                } catch (Exception ignored) {}
                dm.put("productName", productName);
                dm.put("quantity", d.getQuantity());
                dm.put("unitCost", d.getUnitCost());
                dm.put("totalCost", d.getTotalCost());
                dm.put("lotNumber", d.getLotNumber());
                dm.put("warehouseLocation", d.getWarehouseLocation());
                dm.put("itemCondition", d.getItemCondition());
                dm.put("notes", d.getNotes());
                details.add(dm);
            }
        }
        m.put("details", details);
        return m;
    }
}
