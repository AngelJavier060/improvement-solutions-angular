package com.improvementsolutions.controller.inventory;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventorySupplier;
import com.improvementsolutions.service.inventory.InventorySupplierService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventorySupplierController {

    private final InventorySupplierService supplierService;

    public InventorySupplierController(InventorySupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventorySupplier>> list(@PathVariable String ruc) {
        return ResponseEntity.ok(supplierService.list(ruc));
    }

    @PostMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @RequestBody InventorySupplier input) {
        try {
            InventorySupplier created = supplierService.create(ruc, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al crear proveedor", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long id, @RequestBody InventorySupplier input) {
        try {
            InventorySupplier updated = supplierService.update(ruc, id, input);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al actualizar proveedor", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @DeleteMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> delete(@PathVariable String ruc, @PathVariable Long id) {
        try {
            supplierService.delete(ruc, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al eliminar proveedor", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PostMapping("/suppliers/import")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> importFrom(@PathVariable String ruc, @RequestParam("sourceRuc") String sourceRuc) {
        try {
            int created = supplierService.importFromRuc(ruc, sourceRuc);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("imported", created);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al importar proveedores", "INTERNAL_SERVER_ERROR", 500));
        }
    }
}
