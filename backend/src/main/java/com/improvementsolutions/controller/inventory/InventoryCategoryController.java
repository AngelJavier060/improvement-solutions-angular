package com.improvementsolutions.controller.inventory;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryCategory;
import com.improvementsolutions.service.inventory.InventoryCategoryService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryCategoryController {

    private final InventoryCategoryService categoryService;

    public InventoryCategoryController(InventoryCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryCategory>> list(@PathVariable String ruc) {
        return ResponseEntity.ok(categoryService.list(ruc));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @RequestBody InventoryCategory input) {
        try {
            InventoryCategory created = categoryService.create(ruc, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al crear categoría", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long id, @RequestBody InventoryCategory input) {
        try {
            InventoryCategory updated = categoryService.update(ruc, id, input);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al actualizar categoría", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> delete(@PathVariable String ruc, @PathVariable Long id) {
        try {
            categoryService.delete(ruc, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al eliminar categoría", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PostMapping("/categories/import")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> importFrom(@PathVariable String ruc, @RequestParam("sourceRuc") String sourceRuc) {
        try {
            int created = categoryService.importFromRuc(ruc, sourceRuc);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("imported", created);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al importar categorías", "INTERNAL_SERVER_ERROR", 500));
        }
    }
}
