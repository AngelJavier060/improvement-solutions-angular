package com.improvementsolutions.service.inventory;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.dto.inventory.InventoryProductListDto;
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
    private final InventoryProductSchemaService schemaService;
    private final JdbcTemplate jdbc;
    @PersistenceContext
    private EntityManager em;

    public InventoryProductService(
            InventoryProductRepository productRepository,
            InventoryCategoryRepository categoryRepository,
            InventoryAuthorizationService authService,
            InventoryProductSchemaService schemaService,
            JdbcTemplate jdbc) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.authService = authService;
        this.schemaService = schemaService;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBodegaParams(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        Long bid = business.getId();
        List<Map<String, Object>> families = new ArrayList<>();
        List<Map<String, Object>> sections = new ArrayList<>();
        try {
            families.addAll(jdbc.query(
                    "SELECT f.id, f.name, f.code, f.description FROM epp_families f " +
                    "INNER JOIN business_epp_family x ON x.epp_family_id = f.id " +
                    "WHERE x.business_id = ? AND COALESCE(f.active, TRUE) = TRUE ORDER BY f.name",
                    (rs, i) -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", rs.getLong("id"));
                        m.put("name", rs.getString("name"));
                        m.put("code", rs.getString("code"));
                        m.put("description", rs.getString("description"));
                        return m;
                    },
                    bid
            ));
        } catch (Exception e) {
            log.warn("[InventoryProduct] bodega families: {}", e.getMessage());
        }
        try {
            sections.addAll(jdbc.query(
                    "SELECT s.id, s.name, s.code, s.description FROM epp_sections s " +
                    "INNER JOIN business_epp_section x ON x.epp_section_id = s.id " +
                    "WHERE x.business_id = ? AND COALESCE(s.active, TRUE) = TRUE ORDER BY s.name",
                    (rs, i) -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", rs.getLong("id"));
                        m.put("name", rs.getString("name"));
                        m.put("code", rs.getString("code"));
                        m.put("description", rs.getString("description"));
                        return m;
                    },
                    bid
            ));
        } catch (Exception e) {
            log.warn("[InventoryProduct] bodega sections: {}", e.getMessage());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("families", families);
        body.put("sections", sections);
        return body;
    }

    /**
     * Listado seguro: DTO plano, sin proxies JPA. Si Hibernate falla, usa SQL nativo.
     * No debe lanzar: el catálogo puede quedar vacío, pero no 500.
     */
    public List<InventoryProductListDto> listDtos(String ruc) {
        try {
            schemaService.ensureColumns();
        } catch (Exception e) {
            log.warn("[InventoryProduct] ensureColumns: {}", e.getMessage());
        }
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        Long bid = business.getId();
        List<InventoryProduct> items;
        try {
            items = productRepository.findByBusiness_Id(bid);
        } catch (Exception e) {
            log.error("[InventoryProduct] JPA list falló, SQL nativo: {}", e.getMessage(), e);
            items = listNativeSafe(bid);
        }
        try {
            return filterToAssignedCatalog(bid, items).stream()
                    .map(this::toListDtoSafe)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[InventoryProduct] Filtro/DTO falló, devolviendo sin filtro: {}", e.getMessage(), e);
            return items.stream()
                    .map(this::toListDtoSafe)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }
    }

    private List<InventoryProduct> listNativeSafe(Long businessId) {
        try {
            return listLightWithKind(businessId);
        } catch (Exception e) {
            log.warn("[InventoryProduct] SQL con kind falló: {}", e.getMessage());
            try {
                return listLightLegacy(businessId);
            } catch (Exception e2) {
                log.error("[InventoryProduct] SQL legacy falló: {}", e2.getMessage(), e2);
                return List.of();
            }
        }
    }

    @Transactional(readOnly = true)
    public List<InventoryProduct> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return filterToAssignedCatalog(business.getId(), productRepository.findByBusiness_Id(business.getId()));
    }

    /**
     * Fallback de solo lectura para listar productos cuando aún no existen todas
     * las columnas nuevas en la BD. Selecciona únicamente columnas antiguas.
     */
    @Transactional(readOnly = true)
    public List<InventoryProduct> listLight(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return filterToAssignedCatalog(business.getId(), listNativeSafe(business.getId()));
    }

    @SuppressWarnings("unchecked")
    private List<InventoryProduct> listLightWithKind(Long businessId) {
        String sql = "SELECT id, code, category, name, description, unit_of_measure, image, status, product_kind, section_code, section_label "
                   + "FROM inventory_products WHERE business_id = :bid ORDER BY id DESC";
        List<?> rows = em.createNativeQuery(sql)
            .setParameter("bid", businessId)
            .getResultList();
        return mapNativeRows(rows, true);
    }

    @SuppressWarnings("unchecked")
    private List<InventoryProduct> listLightLegacy(Long businessId) {
        String sql = "SELECT id, code, category, name, description, unit_of_measure, image, status "
                   + "FROM inventory_products WHERE business_id = :bid ORDER BY id DESC";
        List<?> rows = em.createNativeQuery(sql)
            .setParameter("bid", businessId)
            .getResultList();
        return mapNativeRows(rows, false);
    }

    private List<InventoryProduct> mapNativeRows(List<?> rows, boolean withKind) {
        List<InventoryProduct> out = new ArrayList<>();
        if (rows == null) return out;
        for (Object raw : rows) {
            try {
                Object[] row = raw instanceof Object[] arr ? arr : new Object[]{ raw };
                out.add(mapLightRow(row, withKind));
            } catch (Exception e) {
                log.warn("[InventoryProduct] Fila nativa omitida: {}", e.getMessage());
            }
        }
        return out;
    }

    private InventoryProduct mapLightRow(Object[] row, boolean withKind) {
        InventoryProduct p = new InventoryProduct();
        p.setId(asLong(row, 0));
        p.setCode(asString(row, 1));
        p.setCategory(asString(row, 2));
        p.setName(asString(row, 3));
        p.setDescription(asString(row, 4));
        p.setUnitOfMeasure(asString(row, 5));
        p.setImage(asString(row, 6));
        String status = asString(row, 7);
        if (status != null) {
            try { p.setStatus(ProductStatus.valueOf(status)); } catch (Exception ignore) { p.setStatus(ProductStatus.ACTIVO); }
        }
        if (withKind && row.length > 8 && row[8] != null) {
            try { p.setProductKind(ProductCategory.valueOf(String.valueOf(row[8]).trim().toUpperCase())); }
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

    private Long asLong(Object[] row, int i) {
        if (row == null || i >= row.length || row[i] == null) return null;
        if (row[i] instanceof Number n) return n.longValue();
        try { return Long.parseLong(String.valueOf(row[i])); } catch (Exception e) { return null; }
    }

    private String asString(Object[] row, int i) {
        if (row == null || i >= row.length || row[i] == null) return null;
        return String.valueOf(row[i]);
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
    public Optional<InventoryProductListDto> getByIdDto(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_RucAndId(ruc, id).map(p -> {
            try {
                if (p.getCategoryRef() != null) p.getCategoryRef().getName();
            } catch (Exception ignore) {}
            return toListDtoSafe(p);
        });
    }

    @Transactional(readOnly = true)
    public Optional<InventoryProduct> getById(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_RucAndId(ruc, id).map(p -> {
            if (p.getCategoryRef() != null) {
                try { p.getCategoryRef().getName(); } catch (Exception ignore) {}
            }
            return p;
        });
    }

    @Transactional
    public InventoryProductListDto create(String ruc, InventoryProduct input) {
        schemaService.ensureColumns();
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
        assertSectionAssigned(business.getId(), entity.getSectionCode());
        applyCategory(business, entity, input);
        entity.setDescription(input.getDescription());
        entity.setUnitOfMeasure(
                input.getUnitOfMeasure() != null && !input.getUnitOfMeasure().isBlank()
                        ? input.getUnitOfMeasure().trim()
                        : "UND"
        );
        entity.setImage(input.getImage());
        entity.setStatus(input.getStatus() != null ? input.getStatus() : ProductStatus.ACTIVO);

        try {
            InventoryProduct saved = productRepository.saveAndFlush(entity);
            try {
                if (saved.getCategoryRef() != null) saved.getCategoryRef().getName();
            } catch (Exception ignore) {}
            InventoryProductListDto dto = toListDtoSafe(saved);
            if (dto == null) throw new IllegalStateException("No se pudo preparar la respuesta del producto creado");
            return dto;
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException(friendlyIntegrityMessage(ex), ex);
        }
    }

    @Transactional
    public InventoryProductListDto update(String ruc, Long id, InventoryProduct input) {
        schemaService.ensureColumns();
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
        assertSectionAssigned(business.getId(), entity.getSectionCode());
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

        try {
            InventoryProduct saved = productRepository.saveAndFlush(entity);
            try {
                if (saved.getCategoryRef() != null) saved.getCategoryRef().getName();
            } catch (Exception ignore) {}
            InventoryProductListDto dto = toListDtoSafe(saved);
            if (dto == null) throw new IllegalStateException("No se pudo preparar la respuesta del producto actualizado");
            return dto;
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException(friendlyIntegrityMessage(ex), ex);
        }
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

    /**
     * El catálogo de productos de la empresa solo incluye SKUs de las
     * familias/secciones asignadas en Inventario-Bodega.
     */
    private List<InventoryProduct> filterToAssignedCatalog(Long businessId, List<InventoryProduct> items) {
        if (items == null || items.isEmpty()) return items;
        Set<String> sections = assignedSectionCodes(businessId);
        Set<String> families = assignedFamilyCodes(businessId);
        if (sections.isEmpty() && families.isEmpty()) {
            return items;
        }
        return items.stream()
                .filter(p -> matchesAssignedCatalog(p, families, sections))
                .collect(Collectors.toList());
    }

    private boolean matchesAssignedCatalog(InventoryProduct p, Set<String> families, Set<String> sections) {
        String section = resolveSectionCode(p);
        String family = resolveFamilyCode(p);
        if (!sections.isEmpty() && (section == null || !sections.contains(section))) {
            return false;
        }
        if (!families.isEmpty() && family != null && !families.contains(family)) {
            return false;
        }
        return true;
    }

    private void assertSectionAssigned(Long businessId, String sectionCode) {
        Set<String> sections = assignedSectionCodes(businessId);
        if (sections.isEmpty()) return;
        String code = sectionCode == null ? "" : sectionCode.trim().toUpperCase(Locale.ROOT);
        if (code.isEmpty() || !sections.contains(code)) {
            throw new IllegalArgumentException(
                    "La sección no está asignada a esta empresa. Asígnala en Inventario-Bodega (Familia / Sección) e inténtalo de nuevo.");
        }
    }

    private Set<String> assignedSectionCodes(Long businessId) {
        try {
            List<String> rows = jdbc.queryForList(
                    "SELECT UPPER(TRIM(s.code)) FROM epp_sections s " +
                    "INNER JOIN business_epp_section x ON x.epp_section_id = s.id " +
                    "WHERE x.business_id = ? AND s.code IS NOT NULL AND TRIM(s.code) <> ''",
                    String.class,
                    businessId
            );
            return rows.stream().filter(c -> c != null && !c.isBlank()).collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("[InventoryProduct] No se pudieron leer secciones asignadas: {}", e.getMessage());
            return Set.of();
        }
    }

    private Set<String> assignedFamilyCodes(Long businessId) {
        try {
            List<String> rows = jdbc.queryForList(
                    "SELECT UPPER(TRIM(f.code)) FROM epp_families f " +
                    "INNER JOIN business_epp_family x ON x.epp_family_id = f.id " +
                    "WHERE x.business_id = ? AND f.code IS NOT NULL AND TRIM(f.code) <> ''",
                    String.class,
                    businessId
            );
            return rows.stream().filter(c -> c != null && !c.isBlank()).collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("[InventoryProduct] No se pudieron leer familias asignadas: {}", e.getMessage());
            return Set.of();
        }
    }

    private String resolveSectionCode(InventoryProduct p) {
        if (p.getSectionCode() != null && !p.getSectionCode().isBlank()) {
            return p.getSectionCode().trim().toUpperCase(Locale.ROOT);
        }
        String code = p.getCode() != null ? p.getCode().trim().toUpperCase(Locale.ROOT) : "";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^[A-Z0-9]{2,4}-([A-Z0-9]{2,4})(?:-|$)").matcher(code);
        return m.find() ? m.group(1) : null;
    }

    private String resolveFamilyCode(InventoryProduct p) {
        String code = p.getCode() != null ? p.getCode().trim().toUpperCase(Locale.ROOT) : "";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^([A-Z0-9]{2,4})-").matcher(code);
        if (m.find()) return m.group(1);
        if (p.getProductKind() == ProductCategory.HERRAMIENTA) return "HER";
        if (p.getProductKind() == ProductCategory.PIEZA) return "PIE";
        return p.getProductKind() == ProductCategory.EPP ? "EPP" : null;
    }

    private InventoryProductListDto toListDtoSafe(InventoryProduct p) {
        if (p == null) return null;
        try {
            InventoryProductListDto dto = new InventoryProductListDto();
            dto.id = p.getId();
            dto.code = p.getCode();
            dto.category = p.getCategory();
            dto.productKind = p.getProductKind() != null ? p.getProductKind().name() : "EPP";
            dto.sectionCode = p.getSectionCode();
            dto.sectionLabel = p.getSectionLabel();
            dto.name = p.getName();
            dto.description = p.getDescription();
            dto.unitOfMeasure = p.getUnitOfMeasure();
            dto.image = p.getImage();
            dto.status = p.getStatus() != null ? p.getStatus().name() : "ACTIVO";
            try {
                if (p.getCategoryRef() != null) {
                    dto.categoryRef = new InventoryProductListDto.CategoryRefDto(
                            p.getCategoryRef().getId(), p.getCategoryRef().getName());
                    if (dto.category == null || dto.category.isBlank()) {
                        dto.category = p.getCategoryRef().getName();
                    }
                }
            } catch (Exception ignore) {
                // open-in-view=false / proxy LAZY
            }
            return dto;
        } catch (Exception e) {
            log.warn("[InventoryProduct] No se pudo mapear producto id={}: {}", p.getId(), e.getMessage());
            return null;
        }
    }

    private String friendlyIntegrityMessage(DataIntegrityViolationException ex) {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        String msg = root.getMessage() != null ? root.getMessage().toLowerCase() : "";
        if (msg.contains("unique") || msg.contains("duplicate") || msg.contains("uq_inventory_products")) {
            return "Ya existe un producto con el mismo código o nombre en esta empresa.";
        }
        if (msg.contains("not-null") || msg.contains("null value") || msg.contains("not null")) {
            return "Faltan datos obligatorios del producto (código, nombre o sección).";
        }
        if (msg.contains("foreign key") || msg.contains("fk_")) {
            return "Hay una referencia inválida (categoría o empresa). Recargue e intente de nuevo.";
        }
        return "No se pudo guardar el producto por una restricción de la base de datos.";
    }
}
