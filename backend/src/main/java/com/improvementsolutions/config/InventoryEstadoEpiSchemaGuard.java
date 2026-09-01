package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Catálogo inventory_estado_epi + join business_inventory_estado_epi.
 */
@Component
@Order(72)
@RequiredArgsConstructor
@Slf4j
public class InventoryEstadoEpiSchemaGuard implements CommandLineRunner {

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
            if (Boolean.TRUE.equals(tableExists("inventory_estado_epi"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE inventory_estado_epi (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(120) NOT NULL,
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            log.info("[InventoryEstadoEpiSchemaGuard] Tabla inventory_estado_epi creada.");
        } catch (Exception e) {
            log.warn("[InventoryEstadoEpiSchemaGuard] ensureCatalogTable: {}", e.getMessage());
        }
    }

    private void ensureUniqueNameIndex() {
        try {
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_estado_epi_name_ci ON inventory_estado_epi (LOWER(TRIM(name)))");
        } catch (Exception e) {
            log.warn("[InventoryEstadoEpiSchemaGuard] uk name: {}", e.getMessage());
        }
    }

    private void seedIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM inventory_estado_epi", Integer.class);
            if (count != null && count > 0) {
                return;
            }
            Object[][] rows = {
                    {"Buen estado (Solo falta de uso)", "El EPP está en buen estado; solo falta de uso o reposición"},
                    {"Desgaste normal", "Desgaste por uso habitual"},
                    {"Deteriorado / Roto", "Mal estado de EPP / deteriorado / roto"},
                    {"No presenta el equipo", "El trabajador no presenta el equipo"}
            };
            for (Object[] r : rows) {
                jdbc.update(
                        "INSERT INTO inventory_estado_epi (name, description, active) VALUES (?, ?, TRUE)",
                        r[0], r[1]
                );
            }
            log.info("[InventoryEstadoEpiSchemaGuard] Seed de estados EPI aplicado.");
        } catch (Exception e) {
            log.warn("[InventoryEstadoEpiSchemaGuard] seedIfEmpty: {}", e.getMessage());
        }
    }

    private void ensureBusinessJoin() {
        try {
            if (Boolean.TRUE.equals(tableExists("business_inventory_estado_epi"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE business_inventory_estado_epi (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    inventory_estado_epi_id BIGINT NOT NULL REFERENCES inventory_estado_epi(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, inventory_estado_epi_id)
                )
                """);
            log.info("[InventoryEstadoEpiSchemaGuard] Tabla business_inventory_estado_epi creada.");
        } catch (Exception e) {
            log.warn("[InventoryEstadoEpiSchemaGuard] ensureBusinessJoin: {}", e.getMessage());
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
