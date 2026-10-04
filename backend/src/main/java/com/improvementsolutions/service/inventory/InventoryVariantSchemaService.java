package com.improvementsolutions.service.inventory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * DDL de compatibilidad fuera de la transacción de lectura.
 * Evita 500 si faltan columnas nuevas en inventory_variants (prod sin Flyway).
 */
@Service
public class InventoryVariantSchemaService {

    private static final Logger log = LoggerFactory.getLogger(InventoryVariantSchemaService.class);

    private final JdbcTemplate jdbc;
    private volatile boolean ensured = false;

    public InventoryVariantSchemaService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureColumns() {
        if (ensured) return;
        synchronized (this) {
            if (ensured) return;
            try {
                ensureColumn("general_specs", "VARCHAR(500)");
                ensureColumn("tech_sheet_pdf", "VARCHAR(255)");
                ensureColumn("size_label", "VARCHAR(50)");
                ensureColumn("dimensions", "VARCHAR(100)");
                ensureColumn("sale_price", "DECIMAL(18,2) DEFAULT 0");
                ensured = true;
            } catch (Exception e) {
                log.warn("[InventoryVariant] No se pudo asegurar columnas: {}", e.getMessage());
            }
        }
    }

    private void ensureColumn(String column, String type) {
        if (columnExists(column)) return;
        jdbc.execute("ALTER TABLE inventory_variants ADD COLUMN " + column + " " + type);
        log.info("[InventoryVariant] Columna {} agregada on-demand.", column);
    }

    private boolean columnExists(String column) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.columns" +
                        " WHERE table_schema = 'public'" +
                        "   AND table_name = 'inventory_variants'" +
                        "   AND column_name = ?" +
                        ")",
                Boolean.class,
                column
        );
        return Boolean.TRUE.equals(exists);
    }
}
