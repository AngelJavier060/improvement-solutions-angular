package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.dto.inventory.InventoryVariantListDto;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.model.inventory.enums.VariantStatus;
import com.improvementsolutions.repository.inventory.InventoryProductRepository;
import com.improvementsolutions.repository.inventory.InventoryVariantRepository;

@Service
public class InventoryVariantService {

    private static final Logger log = LoggerFactory.getLogger(InventoryVariantService.class);

    private final InventoryVariantRepository variantRepository;
    private final InventoryProductRepository productRepository;
    private final InventoryAuthorizationService authService;
    private final InventoryVariantSchemaService schemaService;
    private final JdbcTemplate jdbc;

    public InventoryVariantService(
            InventoryVariantRepository variantRepository,
            InventoryProductRepository productRepository,
            InventoryAuthorizationService authService,
            InventoryVariantSchemaService schemaService,
            JdbcTemplate jdbc) {
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
        this.authService = authService;
        this.schemaService = schemaService;
        this.jdbc = jdbc;
    }

    /**
     * Listado seguro: DTO plano, sin proxies JPA. Si Hibernate falla, SQL nativo.
     * No debe lanzar 500: el visualizador puede quedar vacío, pero el GET responde 200.
     */
    public List<InventoryVariantListDto> listDtos(String ruc, Long productId) {
        try {
            schemaService.ensureColumns();
        } catch (Exception e) {
            log.warn("[InventoryVariant] ensureColumns: {}", e.getMessage());
        }
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (productRepository.findByBusiness_RucAndId(ruc, productId).isEmpty()) {
            throw new IllegalArgumentException("Producto no encontrado");
        }
        try {
            return variantRepository.findByProduct_Id(productId).stream()
                    .map(this::toDtoSafe)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("[InventoryVariant] JPA list falló, SQL nativo: {}", e.getMessage(), e);
            return listNativeSafe(productId, business.getId());
        }
    }

    @Transactional(readOnly = true)
    public List<InventoryVariant> listByProduct(String ruc, Long productId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        requireProductOfBusiness(productId, business.getId());
        return variantRepository.findByProduct_Id(productId);
    }

    @Transactional(readOnly = true)
    public InventoryVariant getById(String ruc, Long variantId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryVariant variant = variantRepository.findById(variantId)
            .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
        if (!variant.getProduct().getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("La variante no pertenece a la empresa");
        }
        return variant;
    }

    @Transactional
    public InventoryVariantListDto create(String ruc, Long productId, InventoryVariant input) {
        try {
            schemaService.ensureColumns();
        } catch (Exception e) {
            log.warn("[InventoryVariant] ensureColumns create: {}", e.getMessage());
        }
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct product = requireProductOfBusiness(productId, business.getId());
        if (input.getCode() == null || input.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("El código de la variante es obligatorio");
        }
        if (variantRepository.existsByProduct_IdAndCode(productId, input.getCode().trim())) {
            throw new IllegalArgumentException("Ya existe una variante con ese código para el producto");
        }
        InventoryVariant entity = new InventoryVariant();
        entity.setProduct(product);
        entity.setCode(input.getCode().trim());
        entity.setDescription(input.getDescription());
        entity.setGeneralSpecs(trimSpecs(input.getGeneralSpecs()));
        entity.setTechSheetPdf(input.getTechSheetPdf());
        entity.setSizeLabel(input.getSizeLabel());
        entity.setDimensions(input.getDimensions());
        entity.setMinQty(input.getMinQty());
        entity.setLocation(input.getLocation());
        entity.setImage(input.getImage());
        entity.setSalePrice(input.getSalePrice());
        entity.setStatus(input.getStatus() != null ? input.getStatus() : VariantStatus.ACTIVO);
        InventoryVariant saved = variantRepository.saveAndFlush(entity);
        return toDtoSafe(saved);
    }

    @Transactional
    public InventoryVariantListDto update(String ruc, Long productId, Long variantId, InventoryVariant input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        requireProductOfBusiness(productId, business.getId());
        InventoryVariant entity = variantRepository.findByIdAndProduct_Id(variantId, productId)
            .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
        if (input.getCode() != null && !input.getCode().trim().isEmpty()) {
            String newCode = input.getCode().trim();
            if (!newCode.equals(entity.getCode()) && variantRepository.existsByProduct_IdAndCode(productId, newCode)) {
                throw new IllegalArgumentException("Ya existe una variante con ese código para el producto");
            }
            entity.setCode(newCode);
        }
        entity.setDescription(input.getDescription());
        entity.setGeneralSpecs(trimSpecs(input.getGeneralSpecs()));
        if (input.getTechSheetPdf() != null) {
            entity.setTechSheetPdf(input.getTechSheetPdf().isBlank() ? null : input.getTechSheetPdf().trim());
        }
        entity.setSizeLabel(input.getSizeLabel());
        entity.setDimensions(input.getDimensions());
        entity.setMinQty(input.getMinQty());
        entity.setLocation(input.getLocation());
        entity.setImage(input.getImage());
        if (input.getSalePrice() != null) entity.setSalePrice(input.getSalePrice());
        if (input.getStatus() != null) entity.setStatus(input.getStatus());
        InventoryVariant saved = variantRepository.saveAndFlush(entity);
        return toDtoSafe(saved);
    }

    private InventoryProduct requireProductOfBusiness(Long productId, Long businessId) {
        InventoryProduct product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        if (product.getBusiness() == null || !businessId.equals(product.getBusiness().getId())) {
            throw new IllegalArgumentException("El producto no pertenece a la empresa");
        }
        return product;
    }

    private InventoryVariantListDto toDtoSafe(InventoryVariant v) {
        if (v == null) return null;
        try {
            InventoryVariantListDto d = new InventoryVariantListDto();
            d.id = v.getId();
            d.code = v.getCode();
            d.description = v.getDescription();
            d.generalSpecs = v.getGeneralSpecs();
            d.techSheetPdf = v.getTechSheetPdf();
            d.sizeLabel = v.getSizeLabel();
            d.dimensions = v.getDimensions();
            d.currentQty = v.getCurrentQty() != null ? v.getCurrentQty() : BigDecimal.ZERO;
            d.minQty = v.getMinQty();
            d.unitCost = v.getUnitCost();
            d.salePrice = v.getSalePrice() != null ? v.getSalePrice() : BigDecimal.ZERO;
            d.location = v.getLocation();
            d.image = v.getImage();
            d.status = v.getStatus() != null ? v.getStatus().name() : "ACTIVO";
            return d;
        } catch (Exception e) {
            log.warn("[InventoryVariant] DTO omitido: {}", e.getMessage());
            return null;
        }
    }

    private List<InventoryVariantListDto> listNativeSafe(Long productId, Long businessId) {
        try {
            return jdbc.query(
                    "SELECT v.id, v.code, v.description, v.general_specs, v.tech_sheet_pdf, v.size_label, v.dimensions, " +
                    "v.current_qty, v.min_qty, v.unit_cost, v.sale_price, v.location, v.image, v.status " +
                    "FROM inventory_variants v " +
                    "INNER JOIN inventory_products p ON p.id = v.product_id " +
                    "WHERE v.product_id = ? AND p.business_id = ? ORDER BY v.id",
                    (rs, i) -> mapNativeRow(rs),
                    productId, businessId
            );
        } catch (Exception e) {
            log.warn("[InventoryVariant] SQL completo falló, legacy: {}", e.getMessage());
            try {
                return jdbc.query(
                        "SELECT v.id, v.code, v.description, v.current_qty, v.min_qty, v.unit_cost, v.location, v.image, v.status " +
                        "FROM inventory_variants v " +
                        "INNER JOIN inventory_products p ON p.id = v.product_id " +
                        "WHERE v.product_id = ? AND p.business_id = ? ORDER BY v.id",
                        (rs, i) -> {
                            InventoryVariantListDto d = new InventoryVariantListDto();
                            d.id = rs.getLong("id");
                            d.code = rs.getString("code");
                            d.description = rs.getString("description");
                            d.currentQty = rs.getBigDecimal("current_qty");
                            d.minQty = rs.getBigDecimal("min_qty");
                            d.unitCost = rs.getBigDecimal("unit_cost");
                            d.location = rs.getString("location");
                            d.image = rs.getString("image");
                            d.status = rs.getString("status");
                            if (d.status == null || d.status.isBlank()) d.status = "ACTIVO";
                            if (d.currentQty == null) d.currentQty = BigDecimal.ZERO;
                            d.salePrice = BigDecimal.ZERO;
                            return d;
                        },
                        productId, businessId
                );
            } catch (Exception e2) {
                log.error("[InventoryVariant] SQL legacy falló: {}", e2.getMessage(), e2);
                return new ArrayList<>();
            }
        }
    }

    private InventoryVariantListDto mapNativeRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        InventoryVariantListDto d = new InventoryVariantListDto();
        d.id = rs.getLong("id");
        d.code = rs.getString("code");
        d.description = rs.getString("description");
        d.generalSpecs = rs.getString("general_specs");
        d.techSheetPdf = rs.getString("tech_sheet_pdf");
        d.sizeLabel = rs.getString("size_label");
        d.dimensions = rs.getString("dimensions");
        d.currentQty = rs.getBigDecimal("current_qty");
        d.minQty = rs.getBigDecimal("min_qty");
        d.unitCost = rs.getBigDecimal("unit_cost");
        d.salePrice = rs.getBigDecimal("sale_price");
        d.location = rs.getString("location");
        d.image = rs.getString("image");
        d.status = rs.getString("status");
        if (d.status == null || d.status.isBlank()) d.status = "ACTIVO";
        if (d.currentQty == null) d.currentQty = BigDecimal.ZERO;
        if (d.salePrice == null) d.salePrice = BigDecimal.ZERO;
        return d;
    }

    private static String trimSpecs(String specs) {
        if (specs == null) return null;
        String t = specs.trim();
        if (t.isEmpty()) return null;
        return t.length() > 500 ? t.substring(0, 500) : t;
    }
}
