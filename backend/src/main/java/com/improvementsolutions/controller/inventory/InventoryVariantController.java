package com.improvementsolutions.controller.inventory;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.model.inventory.InventoryVariantAttribute;
import com.improvementsolutions.service.inventory.InventoryVariantService;
import com.improvementsolutions.repository.inventory.InventoryVariantAttributeRepository;
import com.improvementsolutions.repository.inventory.InventoryVariantRepository;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryVariantController {

    private final InventoryVariantService variantService;
    private final InventoryVariantAttributeRepository attrRepository;
    private final InventoryVariantRepository variantRepository;

    public InventoryVariantController(InventoryVariantService variantService,
                                      InventoryVariantAttributeRepository attrRepository,
                                      InventoryVariantRepository variantRepository) {
        this.variantService = variantService;
        this.attrRepository = attrRepository;
        this.variantRepository = variantRepository;
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

    // ── Atributos de variante ──────────────────────────────────────────

    @GetMapping("/variants/{variantId}/attributes")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<InventoryVariantAttribute>> listAttributes(@PathVariable String ruc, @PathVariable Long variantId) {
        return ResponseEntity.ok(attrRepository.findByVariant_Id(variantId));
    }

    @PostMapping("/variants/{variantId}/attributes")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> createAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @RequestBody InventoryVariantAttribute input) {
        try {
            InventoryVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
            InventoryVariantAttribute attr = new InventoryVariantAttribute();
            attr.setVariant(variant);
            attr.setAttributeName(input.getAttributeName());
            attr.setAttributeValue(input.getAttributeValue());
            return new ResponseEntity<>(attrRepository.save(attr), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/variants/{variantId}/attributes/{attributeId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> updateAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @PathVariable Long attributeId,
                                             @RequestBody InventoryVariantAttribute input) {
        try {
            InventoryVariantAttribute attr = attrRepository.findById(attributeId)
                .orElseThrow(() -> new IllegalArgumentException("Atributo no encontrado"));
            attr.setAttributeName(input.getAttributeName());
            attr.setAttributeValue(input.getAttributeValue());
            return ResponseEntity.ok(attrRepository.save(attr));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/variants/{variantId}/attributes/{attributeId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> deleteAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @PathVariable Long attributeId) {
        attrRepository.deleteById(attributeId);
        return ResponseEntity.noContent().build();
    }
}
