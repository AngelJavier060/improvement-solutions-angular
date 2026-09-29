package com.improvementsolutions.service.inventory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * DDL/DML de compatibilidad fuera de la transacción de lectura.
 * Evita 500 por "Connection is read-only" / rollback-only al listar productos.
 */
@Service
public class InventoryProductSchemaService {

    private static final Logger log = LoggerFactory.getLogger(InventoryProductSchemaService.class);

    private final JdbcTemplate jdbc;
    private volatile boolean productKindEnsured = false;
    private volatile boolean productSectionEnsured = false;

    public InventoryProductSchemaService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureColumns() {
        ensureProductKindColumn();
        ensureProductSectionColumns();
    }

    private void ensureProductKindColumn() {
        if (productKindEnsured) return;
        synchronized (this) {
            if (productKindEnsured) return;
            try {
                if (!columnExists("product_kind")) {
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

    private void ensureProductSectionColumns() {
        if (productSectionEnsured) return;
        synchronized (this) {
            if (productSectionEnsured) return;
            try {
                if (!columnExists("section_code")) {
                    jdbc.execute("ALTER TABLE inventory_products ADD COLUMN section_code VARCHAR(10)");
                    log.info("[InventoryProduct] Columna section_code creada on-demand.");
                }
                if (!columnExists("section_label")) {
                    jdbc.execute("ALTER TABLE inventory_products ADD COLUMN section_label VARCHAR(80)");
                    log.info("[InventoryProduct] Columna section_label creada on-demand.");
                }
                productSectionEnsured = true;
            } catch (Exception e) {
                log.warn("[InventoryProduct] No se pudo asegurar section_*: {}", e.getMessage());
            }
        }
    }

    private boolean columnExists(String column) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.columns" +
                        " WHERE table_schema = 'public'" +
                        "   AND table_name = 'inventory_products'" +
                        "   AND column_name = ?" +
                        ")",
                Boolean.class,
                column
        );
        return Boolean.TRUE.equals(exists);
    }
}
