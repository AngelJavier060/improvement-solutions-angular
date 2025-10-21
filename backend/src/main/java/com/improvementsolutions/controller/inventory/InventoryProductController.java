package com.improvementsolutions.controller.inventory;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.service.inventory.InventoryProductService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryProductController {

    private static final Logger logger = LoggerFactory.getLogger(InventoryProductController.class);
    private final InventoryProductService productService;

    public InventoryProductController(InventoryProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> list(@PathVariable String ruc) {
        logger.info("[InventoryProducts] Solicitando lista de productos para RUC: {}", ruc);
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
                    p.getName(),
                    p.getDescription(),
                    p.getUnitOfMeasure(),
                    p.getImage(),
                    p.getStatus() != null ? p.getStatus().name() : null,
                    p.getMinStock()
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
            String name,
            String description,
            String unitOfMeasure,
            String image,
            String status,
            Integer minStock
    ) {}

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<InventoryProduct> getById(@PathVariable String ruc, @PathVariable Long id) {
        return productService.getById(ruc, id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
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
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
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
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
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
