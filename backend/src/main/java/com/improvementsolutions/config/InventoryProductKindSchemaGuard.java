package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columna product_kind en inventory_products y backfill básico.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class InventoryProductKindSchemaGuard implements CommandLineRunner {

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
            Boolean colExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_products'" +
                            "   AND column_name = 'product_kind'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(colExists)) {
                jdbc.execute("ALTER TABLE inventory_products ADD COLUMN product_kind VARCHAR(20) DEFAULT 'EPP'");
                log.info("[InventoryProductKindGuard] Columna product_kind agregada.");
            }
            jdbc.execute(
                    "UPDATE inventory_products SET product_kind = 'HERRAMIENTA' WHERE product_kind IS NULL AND (" +
                            " UPPER(COALESCE(category,'')) LIKE '%HERRAMIENT%' OR UPPER(COALESCE(code,'')) LIKE 'HER-%'" +
                            ")"
            );
            jdbc.execute(
                    "UPDATE inventory_products SET product_kind = 'PIEZA' WHERE product_kind IS NULL AND (" +
                            " UPPER(COALESCE(category,'')) LIKE '%PIEZA%' OR UPPER(COALESCE(category,'')) LIKE '%REPUESTO%'" +
                            ")"
            );
            jdbc.execute(
                    "UPDATE inventory_products SET product_kind = 'EPP' WHERE product_kind IS NULL AND (" +
                            " UPPER(COALESCE(category,'')) LIKE '%EPP%' OR UPPER(COALESCE(category,'')) LIKE '%PROTECCION%'" +
                            " OR UPPER(COALESCE(code,'')) LIKE 'EPP-%'" +
                            ")"
            );
            jdbc.execute("UPDATE inventory_products SET product_kind = 'EPP' WHERE product_kind IS NULL");
        } catch (Exception e) {
            log.warn("[InventoryProductKindGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }
}
