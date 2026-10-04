package com.improvementsolutions.controller.inventory;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.dto.ErrorResponse;
import com.improvementsolutions.dto.inventory.InventoryVariantListDto;
import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.model.inventory.InventoryVariantAttribute;
import com.improvementsolutions.service.inventory.InventoryVariantService;
import com.improvementsolutions.repository.inventory.InventoryVariantAttributeRepository;
import com.improvementsolutions.repository.inventory.InventoryVariantRepository;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryVariantController {

    private static final Logger logger = LoggerFactory.getLogger(InventoryVariantController.class);

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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> listByProduct(@PathVariable String ruc, @PathVariable Long productId) {
        try {
            List<InventoryVariantListDto> dtos = variantService.listDtos(ruc, productId);
            return ResponseEntity.ok(dtos);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            logger.error("[InventoryVariants] list: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/products/{productId}/variants")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @PathVariable Long productId, @RequestBody InventoryVariant input) {
        try {
            InventoryVariantListDto created = variantService.create(ruc, productId, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (Exception e) {
            logger.error("[InventoryVariants] create: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Error interno al crear variante", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/products/{productId}/variants/{variantId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long productId, @PathVariable Long variantId, @RequestBody InventoryVariant input) {
        try {
            InventoryVariantListDto updated = variantService.update(ruc, productId, variantId, input);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (Exception e) {
            logger.error("[InventoryVariants] update: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Error interno al actualizar variante", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    // ── Atributos de variante ──────────────────────────────────────────

    @GetMapping("/variants/{variantId}/attributes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> listAttributes(@PathVariable String ruc, @PathVariable Long variantId) {
        try {
            return ResponseEntity.ok(attrRepository.findByVariant_Id(variantId));
        } catch (Exception e) {
            logger.error("[InventoryVariants] attributes: {}", e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/variants/{variantId}/attributes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> createAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @RequestBody InventoryVariantAttribute input) {
        try {
            InventoryVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
            InventoryVariantAttribute attr = new InventoryVariantAttribute();
            attr.setVariant(variant);
            attr.setAttributeName(input.getAttributeName());
            attr.setAttributeValue(input.getAttributeValue());
            InventoryVariantAttribute saved = attrRepository.save(attr);
            return new ResponseEntity<>(attributeDto(saved), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("[InventoryVariants] createAttribute: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Error interno al crear atributo", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/variants/{variantId}/attributes/{attributeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> updateAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @PathVariable Long attributeId,
                                             @RequestBody InventoryVariantAttribute input) {
        try {
            InventoryVariantAttribute attr = attrRepository.findById(attributeId)
                .orElseThrow(() -> new IllegalArgumentException("Atributo no encontrado"));
            attr.setAttributeName(input.getAttributeName());
            attr.setAttributeValue(input.getAttributeValue());
            InventoryVariantAttribute saved = attrRepository.save(attr);
            return ResponseEntity.ok(attributeDto(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("[InventoryVariants] updateAttribute: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Error interno al actualizar atributo", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @DeleteMapping("/variants/{variantId}/attributes/{attributeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> deleteAttribute(@PathVariable String ruc, @PathVariable Long variantId,
                                             @PathVariable Long attributeId) {
        attrRepository.deleteById(attributeId);
        return ResponseEntity.noContent().build();
    }

    private static Map<String, Object> attributeDto(InventoryVariantAttribute saved) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("id", saved.getId());
        body.put("attributeName", saved.getAttributeName());
        body.put("attributeValue", saved.getAttributeValue());
        return body;
    }
}
