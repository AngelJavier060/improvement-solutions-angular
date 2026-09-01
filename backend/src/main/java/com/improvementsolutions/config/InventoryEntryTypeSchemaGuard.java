package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura catálogo inventory_entry_types (sin código) y join business_inventory_entry_type.
 */
@Component
@Order(67)
@RequiredArgsConstructor
@Slf4j
public class InventoryEntryTypeSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureCatalogTable();
        dropCodeColumnIfPresent();
        ensureUniqueNameIndex();
        seedIfEmpty();
        ensureBusinessJoin();
        relaxInventoryEntriesEntryTypeColumn();
    }

    /**
     * entry_type pasó de enum fijo (CHECK) a nombre libre del catálogo.
     * Hibernate ddl-auto no elimina el CHECK antiguo → provoca 409 al guardar "Compra", etc.
     */
    private void relaxInventoryEntriesEntryTypeColumn() {
        try {
            if (!Boolean.TRUE.equals(tableExists("inventory_entries"))) {
                return;
            }
            jdbc.execute("ALTER TABLE inventory_entries DROP CONSTRAINT IF EXISTS inventory_entries_entry_type_check");
            // Por si Hibernate o PG nombraron el check de otra forma
            try {
                jdbc.query(
                        "SELECT c.conname FROM pg_constraint c " +
                                "JOIN pg_class t ON c.conrelid = t.oid " +
                                "WHERE t.relname = 'inventory_entries' AND c.contype = 'c' " +
                                "AND pg_get_constraintdef(c.oid) ILIKE '%entry_type%'",
                        (rs, rowNum) -> rs.getString(1)
                ).forEach(name -> {
                    try {
                        jdbc.execute("ALTER TABLE inventory_entries DROP CONSTRAINT IF EXISTS " + name);
                        log.info("[InventoryEntryTypeSchemaGuard] CHECK eliminado: {}", name);
                    } catch (Exception ignore) {}
                });
            } catch (Exception ignore) {}

            try {
                jdbc.execute("ALTER TABLE inventory_entries ALTER COLUMN entry_type TYPE VARCHAR(80)");
            } catch (Exception e) {
                log.warn("[InventoryEntryTypeSchemaGuard] widen entry_type: {}", e.getMessage());
            }
            log.info("[InventoryEntryTypeSchemaGuard] entry_type liberado de CHECK de enum.");
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] relaxInventoryEntriesEntryTypeColumn: {}", e.getMessage());
        }
    }

    private void ensureCatalogTable() {
        try {
            if (Boolean.TRUE.equals(tableExists("inventory_entry_types"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE inventory_entry_types (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(80)  NOT NULL,
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            log.info("[InventoryEntryTypeSchemaGuard] Tabla inventory_entry_types creada.");
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] ensureCatalogTable: {}", e.getMessage());
        }
    }

    private void dropCodeColumnIfPresent() {
        try {
            Boolean hasCode = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'inventory_entry_types'" +
                            "   AND column_name = 'code'" +
                            ")",
                    Boolean.class
            );
            if (Boolean.TRUE.equals(hasCode)) {
                try {
                    jdbc.execute("DROP INDEX IF EXISTS uk_inventory_entry_types_code");
                } catch (Exception ignore) {}
                jdbc.execute("ALTER TABLE inventory_entry_types DROP COLUMN code");
                log.info("[InventoryEntryTypeSchemaGuard] Columna code eliminada de inventory_entry_types.");
            }
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] dropCodeColumnIfPresent: {}", e.getMessage());
        }
    }

    private void ensureUniqueNameIndex() {
        try {
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_entry_types_name_ci ON inventory_entry_types (LOWER(TRIM(name)))");
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] uk name: {}", e.getMessage());
        }
    }

    private void seedIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM inventory_entry_types", Integer.class);
            if (count != null && count > 0) {
                return;
            }
            Object[][] rows = {
                    {"Compra", "Compra a proveedor"},
                    {"Devolución", "Devolución de trabajador o cliente"},
                    {"Transferencia", "Transferencia de otra bodega"},
                    {"Ajuste", "Ajuste de inventario (inventario físico)"},
                    {"Donación", "Donación recibida"}
            };
            for (Object[] r : rows) {
                jdbc.update(
                        "INSERT INTO inventory_entry_types (name, description, active) VALUES (?, ?, TRUE)",
                        r[0], r[1]
                );
            }
            log.info("[InventoryEntryTypeSchemaGuard] Seed de tipos de entrada aplicado.");
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] seedIfEmpty: {}", e.getMessage());
        }
    }

    private void ensureBusinessJoin() {
        try {
            if (Boolean.TRUE.equals(tableExists("business_inventory_entry_type"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE business_inventory_entry_type (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    inventory_entry_type_id BIGINT NOT NULL REFERENCES inventory_entry_types(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, inventory_entry_type_id)
                )
                """);
            log.info("[InventoryEntryTypeSchemaGuard] Tabla business_inventory_entry_type creada.");
        } catch (Exception e) {
            log.warn("[InventoryEntryTypeSchemaGuard] ensureBusinessJoin: {}", e.getMessage());
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
