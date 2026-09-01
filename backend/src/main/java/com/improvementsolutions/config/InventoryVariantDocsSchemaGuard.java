package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columnas general_specs / tech_sheet_pdf en inventory_variants.
 */
@Component
@Order(4)
@RequiredArgsConstructor
@Slf4j
public class InventoryVariantDocsSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_variants'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) return;

            ensureColumn("general_specs", "VARCHAR(500)");
            ensureColumn("tech_sheet_pdf", "VARCHAR(255)");
        } catch (Exception e) {
            log.warn("[InventoryVariantDocsGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private void ensureColumn(String column, String type) {
        Boolean colExists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.columns" +
                        " WHERE table_schema = 'public'" +
                        "   AND table_name = 'inventory_variants'" +
                        "   AND column_name = ?" +
                        ")",
                Boolean.class,
                column
        );
        if (!Boolean.TRUE.equals(colExists)) {
            jdbc.execute("ALTER TABLE inventory_variants ADD COLUMN " + column + " " + type);
            log.info("[InventoryVariantDocsGuard] Columna {} agregada.", column);
        }
    }
}
