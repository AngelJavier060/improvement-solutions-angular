package com.improvementsolutions.controller.inventory;

import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.improvementsolutions.dto.ErrorResponse;
import com.improvementsolutions.dto.inventory.InventoryProductListDto;
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

    @GetMapping("/bodega-params")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> bodegaParams(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(productService.getBodegaParams(ruc));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            logger.error("[InventoryProducts] bodega-params: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("families", List.of(), "sections", List.of()));
        }
    }

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> list(@PathVariable String ruc) {
        logger.info("[InventoryProducts] Solicitando lista de productos para RUC: {}", ruc);
        try {
            List<InventoryProductListDto> dtos = productService.listDtos(ruc);
            logger.info("[InventoryProducts] Se encontraron {} productos", dtos.size());
            return ResponseEntity.ok(dtos);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            logger.error("[InventoryProducts] Error al listar productos: {}", e.getMessage(), e);
            try {
                List<InventoryProductListDto> dtos = productService.listLight(ruc).stream()
                        .map(p -> {
                            InventoryProductListDto d = new InventoryProductListDto();
                            d.id = p.getId();
                            d.code = p.getCode();
                            d.category = p.getCategory();
                            d.productKind = p.getProductKind() != null ? p.getProductKind().name() : "EPP";
                            d.sectionCode = p.getSectionCode();
                            d.sectionLabel = p.getSectionLabel();
                            d.name = p.getName();
                            d.description = p.getDescription();
                            d.unitOfMeasure = p.getUnitOfMeasure();
                            d.image = p.getImage();
                            d.status = p.getStatus() != null ? p.getStatus().name() : "ACTIVO";
                            return d;
                        })
                        .toList();
                return ResponseEntity.ok(dtos);
            } catch (Exception ex) {
                logger.error("[InventoryProducts] Fallback listado falló: {}", ex.getMessage(), ex);
                return ResponseEntity.ok(List.of());
            }
        }
    }

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> getById(@PathVariable String ruc, @PathVariable Long id) {
        try {
            return productService.getByIdDto(ruc, id)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (Exception e) {
            logger.error("[InventoryProducts] getById: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("No se pudo leer el producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @RequestBody InventoryProduct input) {
        try {
            InventoryProductListDto created = productService.create(ruc, input);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (DataIntegrityViolationException e) {
            logger.warn("[InventoryProducts] integridad al crear: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("Ya existe un producto con esos datos o falta un campo obligatorio.", "CONFLICT", 409));
        } catch (Exception e) {
            logger.error("[InventoryProducts] Error al crear producto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(
                            e.getMessage() != null ? e.getMessage() : "Error interno al crear producto",
                            "INTERNAL_SERVER_ERROR",
                            500));
        }
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> update(@PathVariable String ruc, @PathVariable Long id, @RequestBody InventoryProduct input) {
        try {
            return ResponseEntity.ok(productService.update(ruc, id, input));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage(), "FORBIDDEN", 403));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("Ya existe un producto con esos datos o falta un campo obligatorio.", "CONFLICT", 409));
        } catch (Exception e) {
            logger.error("[InventoryProducts] Error al actualizar producto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error interno al actualizar producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> delete(@PathVariable String ruc, @PathVariable Long id) {
        try {
            productService.delete(ruc, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("No se puede eliminar: el producto tiene movimientos o variantes asociadas.", "CONFLICT", 409));
        } catch (Exception e) {
            logger.error("[InventoryProducts] Error al eliminar producto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error interno al eliminar producto", "INTERNAL_SERVER_ERROR", 500));
        }
    }
}
