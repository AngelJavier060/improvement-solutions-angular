package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columnas de cierre de préstamos en inventory_outputs
 * (returned / returned_at / return_entry_id) aunque Flyway no haya corrido aún.
 */
@Component
@Order(28)
@RequiredArgsConstructor
@Slf4j
public class InventoryOutputReturnedSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_outputs'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) {
                return;
            }
            ensureColumn("returned", "BOOLEAN DEFAULT FALSE");
            ensureColumn("returned_at", "TIMESTAMP");
            ensureColumn("return_entry_id", "BIGINT");
            jdbc.execute("UPDATE inventory_outputs SET returned = FALSE WHERE returned IS NULL");
        } catch (Exception e) {
            log.warn("[InventoryOutputReturnedGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private void ensureColumn(String column, String definition) {
        try {
            Boolean colExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_outputs'" +
                            "   AND column_name = ?" +
                            ")",
                    Boolean.class,
                    column
            );
            if (!Boolean.TRUE.equals(colExists)) {
                jdbc.execute("ALTER TABLE inventory_outputs ADD COLUMN " + column + " " + definition);
                log.info("[InventoryOutputReturnedGuard] Columna {} agregada.", column);
            }
        } catch (Exception e) {
            log.warn("[InventoryOutputReturnedGuard] No se pudo agregar columna {}: {}", column, e.getMessage());
        }
    }
}
