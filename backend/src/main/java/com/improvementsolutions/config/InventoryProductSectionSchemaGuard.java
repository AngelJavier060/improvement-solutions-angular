package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columnas section_code / section_label en inventory_products.
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class InventoryProductSectionSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_products'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) {
                return;
            }
            ensureColumn("section_code", "VARCHAR(10)");
            ensureColumn("section_label", "VARCHAR(80)");
            jdbc.execute(
                    "UPDATE inventory_products " +
                            "SET section_code = UPPER(SUBSTRING(code FROM 5 FOR 3)) " +
                            "WHERE section_code IS NULL " +
                            "  AND code ~ '^[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[0-9]+$'"
            );
        } catch (Exception e) {
            log.warn("[InventoryProductSectionGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private void ensureColumn(String column, String type) {
        Boolean colExists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.columns" +
                        " WHERE table_schema = 'public'" +
                        "   AND table_name = 'inventory_products'" +
                        "   AND column_name = ?" +
                        ")",
                Boolean.class,
                column
        );
        if (!Boolean.TRUE.equals(colExists)) {
            jdbc.execute("ALTER TABLE inventory_products ADD COLUMN " + column + " " + type);
            log.info("[InventoryProductSectionGuard] Columna {} agregada.", column);
        }
    }
}
