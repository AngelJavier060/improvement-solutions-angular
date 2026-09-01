package com.improvementsolutions.controller.inventory;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.EppFamily;
import com.improvementsolutions.model.EppSection;
import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.service.inventory.InventoryAuthorizationService;
import com.improvementsolutions.service.inventory.InventoryProductService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryProductController {

    private static final Logger logger = LoggerFactory.getLogger(InventoryProductController.class);
    private final InventoryProductService productService;
    private final InventoryAuthorizationService authService;

    public InventoryProductController(InventoryProductService productService,
                                      InventoryAuthorizationService authService) {
        this.productService = productService;
        this.authService = authService;
    }

    /**
     * Familia / Sección asignadas a la empresa (Inventario-Bodega por empresa).
     */
    @GetMapping("/bodega-params")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> bodegaParams(@PathVariable String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getEppFamilies() != null) {
            business.getEppFamilies().size();
        }
        if (business.getEppSections() != null) {
            business.getEppSections().size();
        }
        List<Map<String, Object>> families = new ArrayList<>();
        if (business.getEppFamilies() != null) {
            for (EppFamily f : business.getEppFamilies()) {
                if (f == null || Boolean.FALSE.equals(f.getActive())) continue;
                Map<String, Object> m = new HashMap<>();
                m.put("id", f.getId());
                m.put("name", f.getName());
                m.put("code", f.getCode());
                m.put("description", f.getDescription());
                families.add(m);
            }
        }
        families.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
        List<Map<String, Object>> sections = new ArrayList<>();
        if (business.getEppSections() != null) {
            for (EppSection s : business.getEppSections()) {
                if (s == null || Boolean.FALSE.equals(s.getActive())) continue;
                Map<String, Object> m = new HashMap<>();
                m.put("id", s.getId());
                m.put("name", s.getName());
                m.put("code", s.getCode());
                m.put("description", s.getDescription());
                sections.add(m);
            }
        }
        sections.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
        Map<String, Object> body = new HashMap<>();
        body.put("families", families);
        body.put("sections", sections);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> list(@PathVariable String ruc) {
        logger.info("[InventoryProducts] Solicitando lista de productos para RUC: {}", ruc);
        // Asegurar columna antes de cualquier SELECT JPA (prod sin Flyway).
        try {
            productService.ensureProductKindColumn();
        } catch (Exception ignore) {}
        try {
            List<InventoryProduct> items = productService.list(ruc);
            logger.info("[InventoryProducts] Se encontraron {} productos", items.size());
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            logger.error("[InventoryProducts] Error al listar productos (normal): {}", e.getMessage(), e);
            // Fallback de compatibilidad: intentar consulta "ligera" por si faltan columnas nuevas
            try {
                logger.warn("[InventoryProducts] Intentando consulta ligera como fallback...");
                List<InventoryProduct> light = productService.listLight(ruc);
                // Mapear a DTO seguro
                List<ProductListDto> dtos = light.stream().map(p -> new ProductListDto(
                    p.getId(),
                    p.getCode(),
                    p.getCategory(),
                    p.getProductKind() != null ? p.getProductKind().name() : "EPP",
                    p.getSectionCode(),
                    p.getSectionLabel(),
                    p.getName(),
                    p.getDescription(),
                    p.getUnitOfMeasure(),
                    p.getImage(),
                    p.getStatus() != null ? p.getStatus().name() : null
                )).toList();
                logger.info("[InventoryProducts] Consulta ligera exitosa: {} productos", dtos.size());
                return ResponseEntity.ok(dtos);
            } catch (Exception ex) {
                logger.error("[InventoryProducts] Falló también la consulta ligera: {}", ex.getMessage(), ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new com.improvementsolutions.dto.ErrorResponse(
                        e.getMessage() != null ? e.getMessage() : "Error interno al listar productos",
                        "INTERNAL_SERVER_ERROR",
                        500));
            }
        }
    }

    // DTO liviano para listado
    public static record ProductListDto(
            Long id,
            String code,
            String category,
            String productKind,
            String sectionCode,
            String sectionLabel,
            String name,
            String description,
            String unitOfMeasure,
            String image,
            String status
    ) {}

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<InventoryProduct> getById(@PathVariable String ruc, @PathVariable Long id) {
        return productService.getById(ruc, id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @RequestBody InventoryProduct input) {
        try {
            InventoryProduct created = productService.create(ruc, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al crear producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long id, @RequestBody InventoryProduct input) {
        try {
            InventoryProduct updated = productService.update(ruc, id, input);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al actualizar producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> delete(@PathVariable String ruc, @PathVariable Long id) {
        try {
            productService.delete(ruc, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new com.improvementsolutions.dto.ErrorResponse("Error interno al eliminar producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }
}
