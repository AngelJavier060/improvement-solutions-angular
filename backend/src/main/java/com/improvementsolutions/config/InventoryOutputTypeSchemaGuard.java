package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Catálogo inventory_output_types + join business_inventory_output_type
 * y libera CHECK antiguo de inventory_outputs.output_type.
 */
@Component
@Order(70)
@RequiredArgsConstructor
@Slf4j
public class InventoryOutputTypeSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureCatalogTable();
        ensureUniqueNameIndex();
        seedIfEmpty();
        ensureBusinessJoin();
        relaxInventoryOutputsOutputTypeColumn();
    }

    private void ensureCatalogTable() {
        try {
            if (Boolean.TRUE.equals(tableExists("inventory_output_types"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE inventory_output_types (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(80)  NOT NULL,
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            log.info("[InventoryOutputTypeSchemaGuard] Tabla inventory_output_types creada.");
        } catch (Exception e) {
            log.warn("[InventoryOutputTypeSchemaGuard] ensureCatalogTable: {}", e.getMessage());
        }
    }

    private void ensureUniqueNameIndex() {
        try {
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_output_types_name_ci ON inventory_output_types (LOWER(TRIM(name)))");
        } catch (Exception e) {
            log.warn("[InventoryOutputTypeSchemaGuard] uk name: {}", e.getMessage());
        }
    }

    private void seedIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM inventory_output_types", Integer.class);
            if (count != null && count > 0) {
                return;
            }
            Object[][] rows = {
                    {"Entrega de EPP a trabajador", "Dotación / entrega de EPP al personal"},
                    {"Préstamo de herramienta", "Préstamo temporal de herramienta o equipo"},
                    {"Consumo de proyecto/área", "Consumo interno de un proyecto o área"},
                    {"Baja de productos", "Baja por daño, vencimiento u obsolescencia"},
                    {"Venta de producto", "Salida por venta a cliente"},
                    {"Descuento a trabajador (nómina)", "Cargo / descuento al trabajador en nómina"}
            };
            for (Object[] r : rows) {
                jdbc.update(
                        "INSERT INTO inventory_output_types (name, description, active) VALUES (?, ?, TRUE)",
                        r[0], r[1]
                );
            }
            log.info("[InventoryOutputTypeSchemaGuard] Seed de tipos de salida aplicado.");
        } catch (Exception e) {
            log.warn("[InventoryOutputTypeSchemaGuard] seedIfEmpty: {}", e.getMessage());
        }
    }

    private void ensureBusinessJoin() {
        try {
            if (Boolean.TRUE.equals(tableExists("business_inventory_output_type"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE business_inventory_output_type (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    inventory_output_type_id BIGINT NOT NULL REFERENCES inventory_output_types(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, inventory_output_type_id)
                )
                """);
            log.info("[InventoryOutputTypeSchemaGuard] Tabla business_inventory_output_type creada.");
        } catch (Exception e) {
            log.warn("[InventoryOutputTypeSchemaGuard] ensureBusinessJoin: {}", e.getMessage());
        }
    }

    private void relaxInventoryOutputsOutputTypeColumn() {
        try {
            if (!Boolean.TRUE.equals(tableExists("inventory_outputs"))) {
                return;
            }
            jdbc.execute("ALTER TABLE inventory_outputs DROP CONSTRAINT IF EXISTS inventory_outputs_output_type_check");
            try {
                jdbc.query(
                        "SELECT c.conname FROM pg_constraint c " +
                                "JOIN pg_class t ON c.conrelid = t.oid " +
                                "WHERE t.relname = 'inventory_outputs' AND c.contype = 'c' " +
                                "AND pg_get_constraintdef(c.oid) ILIKE '%output_type%'",
                        (rs, rowNum) -> rs.getString(1)
                ).forEach(name -> {
                    try {
                        jdbc.execute("ALTER TABLE inventory_outputs DROP CONSTRAINT IF EXISTS " + name);
                        log.info("[InventoryOutputTypeSchemaGuard] CHECK eliminado: {}", name);
                    } catch (Exception ignore) {}
                });
            } catch (Exception ignore) {}

            try {
                jdbc.execute("ALTER TABLE inventory_outputs ALTER COLUMN output_type TYPE VARCHAR(80)");
            } catch (Exception e) {
                log.warn("[InventoryOutputTypeSchemaGuard] widen output_type: {}", e.getMessage());
            }
            log.info("[InventoryOutputTypeSchemaGuard] output_type liberado de CHECK de enum.");
        } catch (Exception e) {
            log.warn("[InventoryOutputTypeSchemaGuard] relaxInventoryOutputsOutputTypeColumn: {}", e.getMessage());
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
