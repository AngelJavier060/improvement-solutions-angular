package com.improvementsolutions.controller.inventory;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.service.inventory.InventoryVariantService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryVariantController {

    private final InventoryVariantService variantService;

    public InventoryVariantController(InventoryVariantService variantService) {
        this.variantService = variantService;
    }

    @GetMapping("/products/{productId}/variants")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryVariant>> listByProduct(@PathVariable String ruc, @PathVariable Long productId) {
        return ResponseEntity.ok(variantService.listByProduct(ruc, productId));
    }

    @PostMapping("/products/{productId}/variants")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @PathVariable Long productId, @RequestBody InventoryVariant input) {
        try {
            InventoryVariant created = variantService.create(ruc, productId, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al crear variante", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/products/{productId}/variants/{variantId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long productId, @PathVariable Long variantId, @RequestBody InventoryVariant input) {
        try {
            InventoryVariant updated = variantService.update(ruc, productId, variantId, input);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al actualizar variante", "INTERNAL_SERVER_ERROR", 500));
        }
    }
}
