package com.improvementsolutions.service.inventory;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryCategory;
import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.model.inventory.enums.ProductCategory;
import com.improvementsolutions.model.inventory.enums.ProductStatus;
import com.improvementsolutions.repository.inventory.InventoryCategoryRepository;
import com.improvementsolutions.repository.inventory.InventoryProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class InventoryProductService {

    private static final Logger log = LoggerFactory.getLogger(InventoryProductService.class);

    private final InventoryProductRepository productRepository;
    private final InventoryCategoryRepository categoryRepository;
    private final InventoryAuthorizationService authService;
    private final JdbcTemplate jdbc;
    @PersistenceContext
    private EntityManager em;
    private volatile boolean productKindEnsured = false;
    private volatile boolean productSectionEnsured = false;

    public InventoryProductService(
            InventoryProductRepository productRepository,
            InventoryCategoryRepository categoryRepository,
            InventoryAuthorizationService authService,
            JdbcTemplate jdbc) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.authService = authService;
        this.jdbc = jdbc;
    }

    /** Crea product_kind si falta (local sin Flyway / backend sin reiniciar). */
    public void ensureProductKindColumn() {
        if (productKindEnsured) return;
        synchronized (this) {
            if (productKindEnsured) return;
            try {
                Boolean exists = jdbc.queryForObject(
                        "SELECT EXISTS (" +
                                " SELECT 1 FROM information_schema.columns" +
                                " WHERE table_schema = 'public'" +
                                "   AND table_name = 'inventory_products'" +
                                "   AND column_name = 'product_kind'" +
                                ")",
                        Boolean.class
                );
                if (!Boolean.TRUE.equals(exists)) {
                    jdbc.execute("ALTER TABLE inventory_products ADD COLUMN product_kind VARCHAR(20) DEFAULT 'EPP'");
                    log.info("[InventoryProduct] Columna product_kind creada on-demand.");
                }
                jdbc.execute("UPDATE inventory_products SET product_kind = 'EPP' WHERE product_kind IS NULL");
                productKindEnsured = true;
            } catch (Exception e) {
                log.warn("[InventoryProduct] No se pudo asegurar product_kind: {}", e.getMessage());
            }
        }
    }

    /** Crea section_code / section_label si faltan. */
    public void ensureProductSectionColumns() {
        if (productSectionEnsured) return;
        synchronized (this) {
            if (productSectionEnsured) return;
            try {
                for (String[] col : new String[][]{
                        {"section_code", "VARCHAR(10)"},
                        {"section_label", "VARCHAR(80)"}
                }) {
                    Boolean exists = jdbc.queryForObject(
                            "SELECT EXISTS (" +
                                    " SELECT 1 FROM information_schema.columns" +
                                    " WHERE table_schema = 'public'" +
                                    "   AND table_name = 'inventory_products'" +
                                    "   AND column_name = ?" +
                                    ")",
                            Boolean.class,
                            col[0]
                    );
                    if (!Boolean.TRUE.equals(exists)) {
                        jdbc.execute("ALTER TABLE inventory_products ADD COLUMN " + col[0] + " " + col[1]);
                        log.info("[InventoryProduct] Columna {} creada on-demand.", col[0]);
                    }
                }
                productSectionEnsured = true;
            } catch (Exception e) {
                log.warn("[InventoryProduct] No se pudo asegurar section_*: {}", e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<InventoryProduct> list(String ruc) {
        ensureProductKindColumn();
        ensureProductSectionColumns();
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_Id(business.getId());
    }

    /**
     * Fallback de solo lectura para listar productos cuando aún no existen todas
     * las columnas nuevas en la BD. Selecciona únicamente columnas antiguas.
     */
    @Transactional(readOnly = true)
    public List<InventoryProduct> listLight(String ruc) {
        ensureProductKindColumn();
        ensureProductSectionColumns();
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        try {
            return listLightWithKind(business.getId());
        } catch (Exception ex) {
            log.warn("[InventoryProduct] listLight con product_kind falló, usando legacy: {}", ex.getMessage());
            return listLightLegacy(business.getId());
        }
    }

    @SuppressWarnings("unchecked")
    private List<InventoryProduct> listLightWithKind(Long businessId) {
        String sql = "SELECT id, code, category, name, description, unit_of_measure, image, status, product_kind, section_code, section_label "
                   + "FROM inventory_products WHERE business_id = :bid ORDER BY id DESC";
        List<Object[]> rows = em.createNativeQuery(sql)
            .setParameter("bid", businessId)
            .getResultList();
        List<InventoryProduct> out = new ArrayList<>();
        for (Object[] row : rows) {
            InventoryProduct p = mapLightRow(row, true);
            out.add(p);
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<InventoryProduct> listLightLegacy(Long businessId) {
        String sql = "SELECT id, code, category, name, description, unit_of_measure, image, status "
                   + "FROM inventory_products WHERE business_id = :bid ORDER BY id DESC";
        List<Object[]> rows = em.createNativeQuery(sql)
            .setParameter("bid", businessId)
            .getResultList();
        List<InventoryProduct> out = new ArrayList<>();
        for (Object[] row : rows) {
            out.add(mapLightRow(row, false));
        }
        return out;
    }

    private InventoryProduct mapLightRow(Object[] row, boolean withKind) {
        InventoryProduct p = new InventoryProduct();
        p.setId(((Number) row[0]).longValue());
        p.setCode((String) row[1]);
        p.setCategory((String) row[2]);
        p.setName((String) row[3]);
        p.setDescription((String) row[4]);
        p.setUnitOfMeasure((String) row[5]);
        p.setImage((String) row[6]);
        String status = (String) row[7];
        if (status != null) {
            try { p.setStatus(ProductStatus.valueOf(status)); } catch (Exception ignore) {}
        }
        if (withKind && row.length > 8 && row[8] != null) {
            try { p.setProductKind(ProductCategory.valueOf(String.valueOf(row[8]))); }
            catch (Exception ignore) { p.setProductKind(ProductCategory.EPP); }
            if (row.length > 10) {
                if (row[9] != null) p.setSectionCode(String.valueOf(row[9]));
                if (row[10] != null) p.setSectionLabel(String.valueOf(row[10]));
            }
        } else {
            p.setProductKind(inferKindFromCategory(p.getCategory(), p.getCode()));
        }
        if (p.getSectionCode() == null || p.getSectionCode().isBlank()) {
            inferSectionFromCode(p);
        }
        return p;
    }

    private void inferSectionFromCode(InventoryProduct p) {
        String code = p.getCode() != null ? p.getCode().toUpperCase() : "";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^[A-Z0-9]{3}-([A-Z0-9]{3})-\\d+$").matcher(code);
        if (m.find()) {
            p.setSectionCode(m.group(1));
            p.setSectionLabel(defaultSectionLabel(m.group(1)));
        }
    }

    private String defaultSectionLabel(String code) {
        if (code == null) return null;
        return switch (code.toUpperCase()) {
            case "CAS" -> "Casco";
            case "PAN" -> "Pantalón";
            case "CAM" -> "Camisa";
            case "OVE" -> "Overol";
            case "GUA" -> "Guantes";
            case "BOT" -> "Botas";
            case "RES" -> "Respirador";
            case "ARN" -> "Arnés";
            case "TAL" -> "Taladro / eléctrica";
            case "MAN" -> "Manual";
            case "MED" -> "Medición";
            case "COR" -> "Corte";
            case "REP" -> "Repuesto";
            case "CON" -> "Consumible";
            case "OTR" -> "Otro";
            default -> code;
        };
    }

    private ProductCategory inferKindFromCategory(String category, String code) {
        String cat = category != null ? category.toUpperCase() : "";
        String c = code != null ? code.toUpperCase() : "";
        if (cat.contains("HERRAMIENT") || c.startsWith("HER-") || c.startsWith("HERR-")) return ProductCategory.HERRAMIENTA;
        if (cat.contains("PIEZA") || cat.contains("REPUESTO") || c.startsWith("PIE-")) return ProductCategory.PIEZA;
        return ProductCategory.EPP;
    }

    @Transactional(readOnly = true)
    public Optional<InventoryProduct> getById(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_RucAndId(ruc, id).map(p -> {
            // Forzar carga de asociaciones LAZY para serializar nombre de categoría.
            if (p.getCategoryRef() != null) {
                p.getCategoryRef().getName();
            }
            return p;
        });
    }

    @Transactional
    public InventoryProduct create(String ruc, InventoryProduct input) {
        ensureProductKindColumn();
        ensureProductSectionColumns();
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);

        if (input.getCode() == null || input.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("El código del producto es obligatorio");
        }
        if (input.getName() == null || input.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del producto es obligatorio");
        }
        validateSpecificProductName(input.getName());
        if (input.getSectionCode() == null || input.getSectionCode().trim().isEmpty()) {
            throw new IllegalArgumentException("La sección del producto es obligatoria (ej: Casco, Pantalón)");
        }
        if (input.getCategoryRef() == null && (input.getCategory() == null || input.getCategory().trim().isEmpty())) {
            // Se completa desde la familia más abajo
            input.setCategory(defaultCategoryForKind(resolveProductKind(input)));
        }
        if (productRepository.existsByBusiness_IdAndCodeIgnoreCase(business.getId(), input.getCode().trim())) {
            throw new IllegalArgumentException("Ya existe un producto con ese código en la empresa. El código debe ser único.");
        }
        if (productRepository.existsByBusiness_IdAndNameIgnoreCase(business.getId(), input.getName().trim())) {
            throw new IllegalArgumentException("Ya existe un producto con ese nombre en la empresa. El nombre debe ser único.");
        }

        InventoryProduct entity = new InventoryProduct();
        entity.setBusiness(business);
        entity.setCode(input.getCode().trim());
        entity.setName(input.getName().trim());
        entity.setProductKind(resolveProductKind(input));
        applySection(entity, input);
        applyCategory(business, entity, input);
        entity.setDescription(input.getDescription());
        entity.setUnitOfMeasure(
                input.getUnitOfMeasure() != null && !input.getUnitOfMeasure().isBlank()
                        ? input.getUnitOfMeasure().trim()
                        : "UND"
        );
        entity.setImage(input.getImage());
        entity.setStatus(input.getStatus() != null ? input.getStatus() : ProductStatus.ACTIVO);

        return productRepository.save(entity);
    }

    @Transactional
    public InventoryProduct update(String ruc, Long id, InventoryProduct input) {
        ensureProductKindColumn();
        ensureProductSectionColumns();
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        if (input.getCode() != null && !input.getCode().trim().isEmpty()) {
            String newCode = input.getCode().trim();
            if (!newCode.equalsIgnoreCase(entity.getCode())
                    && productRepository.existsByBusiness_IdAndCodeIgnoreCaseAndIdNot(business.getId(), newCode, id)) {
                throw new IllegalArgumentException("Ya existe un producto con ese código en la empresa. El código debe ser único.");
            }
            entity.setCode(newCode);
        }
        if (input.getName() != null) {
            validateSpecificProductName(input.getName());
            String newName = input.getName().trim();
            if (!newName.equalsIgnoreCase(entity.getName() != null ? entity.getName() : "")
                    && productRepository.existsByBusiness_IdAndNameIgnoreCaseAndIdNot(business.getId(), newName, id)) {
                throw new IllegalArgumentException("Ya existe un producto con ese nombre en la empresa. El nombre debe ser único.");
            }
            entity.setName(newName);
        }
        if (input.getProductKind() != null) {
            entity.setProductKind(input.getProductKind());
        }
        applySection(entity, input);
        if (input.getCategory() == null || input.getCategory().trim().isEmpty()) {
            input.setCategory(defaultCategoryForKind(entity.getProductKind()));
        }
        applyCategory(business, entity, input);
        entity.setDescription(input.getDescription());
        if (input.getUnitOfMeasure() != null && !input.getUnitOfMeasure().isBlank()) {
            entity.setUnitOfMeasure(input.getUnitOfMeasure().trim());
        } else if (entity.getUnitOfMeasure() == null || entity.getUnitOfMeasure().isBlank()) {
            entity.setUnitOfMeasure("UND");
        }
        entity.setImage(input.getImage());
        if (input.getStatus() != null) entity.setStatus(input.getStatus());

        return productRepository.save(entity);
    }

    @Transactional
    public void softDelete(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        entity.setStatus(ProductStatus.INACTIVO);
        productRepository.save(entity);
    }

    /**
     * Elimina un producto según su estado:
     * - Si está ACTIVO, se marca como INACTIVO (borrado lógico)
     * - Si ya está INACTIVO, se elimina físicamente (borrado definitivo)
     */
    @Transactional
    public void delete(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        if (entity.getStatus() == ProductStatus.INACTIVO) {
            productRepository.delete(entity);
        } else {
            entity.setStatus(ProductStatus.INACTIVO);
            productRepository.save(entity);
        }
    }

    private ProductCategory resolveProductKind(InventoryProduct input) {
        if (input.getProductKind() != null) {
            return input.getProductKind();
        }
        return inferKindFromCategory(input.getCategory(), input.getCode());
    }

    /**
     * Sincroniza category (texto) y categoryRef (FK).
     * Si solo viene el nombre, busca/crea la categoría de la empresa y limpia FK vieja
     * para que al editar se muestre exactamente lo guardado.
     */
    private void applyCategory(Business business, InventoryProduct entity, InventoryProduct input) {
        if (input.getCategoryRef() != null && input.getCategoryRef().getId() != null) {
            InventoryCategory cat = categoryRepository.findByIdAndBusiness_Id(input.getCategoryRef().getId(), business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
            entity.setCategoryRef(cat);
            entity.setCategory(cat.getName());
            return;
        }

        String name = input.getCategory() != null ? input.getCategory().trim() : null;
        if (name == null || name.isEmpty()) {
            return;
        }
        entity.setCategory(name);
        Optional<InventoryCategory> byName = categoryRepository.findByBusiness_IdAndNameIgnoreCase(business.getId(), name);
        if (byName.isPresent()) {
            entity.setCategoryRef(byName.get());
        } else {
            // Crear categoría de empresa con ese nombre para que el FK quede alineado
            InventoryCategory created = new InventoryCategory();
            created.setBusiness(business);
            created.setName(name);
            created.setActive(true);
            entity.setCategoryRef(categoryRepository.save(created));
        }
    }

    private void applySection(InventoryProduct entity, InventoryProduct input) {
        if (input.getSectionCode() == null || input.getSectionCode().trim().isEmpty()) {
            if (entity.getSectionCode() == null) {
                inferSectionFromCode(entity);
            }
            return;
        }
        String code = input.getSectionCode().trim().toUpperCase();
        entity.setSectionCode(code);
        String label = input.getSectionLabel() != null && !input.getSectionLabel().trim().isEmpty()
                ? input.getSectionLabel().trim()
                : defaultSectionLabel(code);
        entity.setSectionLabel(label);
    }

    private String defaultCategoryForKind(ProductCategory kind) {
        if (kind == ProductCategory.HERRAMIENTA) return "Equipos y Herramientas";
        if (kind == ProductCategory.PIEZA) return "Piezas";
        return "EPP";
    }

    /** Evita productos genéricos tipo "EPP" / "Equipo de protección personal". */
    private void validateSpecificProductName(String name) {
        String n = name == null ? "" : name.trim().toLowerCase()
                .replace("á", "a").replace("é", "e").replace("í", "i")
                .replace("ó", "o").replace("ú", "u");
        java.util.Set<String> banned = java.util.Set.of(
                "epp",
                "equipo de proteccion personal",
                "equipos de proteccion personal",
                "herramienta",
                "herramientas",
                "pieza",
                "piezas",
                "producto",
                "producto general",
                "general",
                "varios",
                "equipo",
                "equipos"
        );
        if (banned.contains(n)) {
            throw new IllegalArgumentException(
                    "El nombre debe ser un producto concreto (ej: Casco 3M H-700), no la familia o sección (EPP, Herramientas, etc.)");
        }
    }
}
