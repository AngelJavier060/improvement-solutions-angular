package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Elimina columnas de inventory_products que ya no se usan (marca/stock en variante).
 */
@Component
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class InventoryProductCleanupSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    private static final String[] DROP_COLS = {
            "brand",
            "model",
            "specs_json",
            "certifications_json",
            "min_stock",
            "max_stock",
            "supplier_id"
    };

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public' AND table_name = 'inventory_products'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) return;

            for (String col : DROP_COLS) {
                Boolean exists = jdbc.queryForObject(
                        "SELECT EXISTS (" +
                                " SELECT 1 FROM information_schema.columns" +
                                " WHERE table_schema = 'public'" +
                                "   AND table_name = 'inventory_products'" +
                                "   AND column_name = ?" +
                                ")",
                        Boolean.class,
                        col
                );
                if (Boolean.TRUE.equals(exists)) {
                    jdbc.execute("ALTER TABLE inventory_products DROP COLUMN " + col);
                    log.info("[InventoryProductCleanup] Columna {} eliminada.", col);
                }
            }
        } catch (Exception e) {
            log.warn("[InventoryProductCleanup] No se pudo limpiar columnas: {}", e.getMessage());
        }
    }
}
