package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Catálogo inventory_acontecimiento_types + join business_inventory_acontecimiento_type.
 */
@Component
@Order(71)
@RequiredArgsConstructor
@Slf4j
public class InventoryAcontecimientoTypeSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureCatalogTable();
        ensureUniqueNameIndex();
        seedIfEmpty();
        ensureBusinessJoin();
    }

    private void ensureCatalogTable() {
        try {
            if (Boolean.TRUE.equals(tableExists("inventory_acontecimiento_types"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE inventory_acontecimiento_types (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(80)  NOT NULL,
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            log.info("[InventoryAcontecimientoTypeSchemaGuard] Tabla inventory_acontecimiento_types creada.");
        } catch (Exception e) {
            log.warn("[InventoryAcontecimientoTypeSchemaGuard] ensureCatalogTable: {}", e.getMessage());
        }
    }

    private void ensureUniqueNameIndex() {
        try {
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_acontecimiento_types_name_ci ON inventory_acontecimiento_types (LOWER(TRIM(name)))");
        } catch (Exception e) {
            log.warn("[InventoryAcontecimientoTypeSchemaGuard] uk name: {}", e.getMessage());
        }
    }

    private void seedIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM inventory_acontecimiento_types", Integer.class);
            if (count != null && count > 0) {
                return;
            }
            Object[][] rows = {
                    {"Solicitud de EPP", "Pedido o reposición de equipo de protección personal"},
                    {"Incumplimiento de uso", "Trabajador no usa el EPP correctamente"},
                    {"Deterioro prematuro", "EPP en mal estado / deterioro prematuro"},
                    {"Pérdida de equipo", "Extravío o pérdida del EPP asignado"},
                    {"Inspección de rutina", "Revisión periódica del estado del EPP"}
            };
            for (Object[] r : rows) {
                jdbc.update(
                        "INSERT INTO inventory_acontecimiento_types (name, description, active) VALUES (?, ?, TRUE)",
                        r[0], r[1]
                );
            }
            log.info("[InventoryAcontecimientoTypeSchemaGuard] Seed de tipos de acontecimiento aplicado.");
        } catch (Exception e) {
            log.warn("[InventoryAcontecimientoTypeSchemaGuard] seedIfEmpty: {}", e.getMessage());
        }
    }

    private void ensureBusinessJoin() {
        try {
            if (Boolean.TRUE.equals(tableExists("business_inventory_acontecimiento_type"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE business_inventory_acontecimiento_type (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    inventory_acontecimiento_type_id BIGINT NOT NULL REFERENCES inventory_acontecimiento_types(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, inventory_acontecimiento_type_id)
                )
                """);
            log.info("[InventoryAcontecimientoTypeSchemaGuard] Tabla business_inventory_acontecimiento_type creada.");
        } catch (Exception e) {
            log.warn("[InventoryAcontecimientoTypeSchemaGuard] ensureBusinessJoin: {}", e.getMessage());
        }
    }

    private Boolean tableExists(String table) {
        return jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.tables" +
                        " WHERE table_schema = 'public' AND table_name = ?" +
                        ")",
                Boolean.class,
                table
        );
    }
}
