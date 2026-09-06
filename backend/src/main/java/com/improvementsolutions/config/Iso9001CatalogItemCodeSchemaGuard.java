package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columna {@code item_code} en iso_9001_catalog_items (código corto para número de registro).
 */
@Component
@Order(73)
@RequiredArgsConstructor
@Slf4j
public class Iso9001CatalogItemCodeSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureItemCodeColumn();
        ensureUniqueCodeIndex();
        seedExampleTipoDocumentoCode();
    }

    private void ensureItemCodeColumn() {
        try {
            if (!Boolean.TRUE.equals(tableExists("iso_9001_catalog_items"))) {
                return;
            }
            if (Boolean.TRUE.equals(columnExists("iso_9001_catalog_items", "item_code"))) {
                return;
            }
            jdbc.execute("ALTER TABLE iso_9001_catalog_items ADD COLUMN item_code VARCHAR(5)");
            log.info("[Iso9001CatalogItemCodeSchemaGuard] Columna item_code agregada.");
        } catch (Exception e) {
            log.warn("[Iso9001CatalogItemCodeSchemaGuard] ensureItemCodeColumn: {}", e.getMessage());
        }
    }

    private void ensureUniqueCodeIndex() {
        try {
            jdbc.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uk_iso9001_catalog_item_code
                    ON iso_9001_catalog_items (catalog_code, UPPER(TRIM(item_code)))
                    WHERE item_code IS NOT NULL AND TRIM(item_code) <> ''
                """);
        } catch (Exception e) {
            log.warn("[Iso9001CatalogItemCodeSchemaGuard] uk code: {}", e.getMessage());
        }
    }

    private void seedExampleTipoDocumentoCode() {
        try {
            int nDoc = jdbc.update("""
                UPDATE iso_9001_catalog_items
                SET item_code = 'DOC', updated_at = CURRENT_TIMESTAMP
                WHERE catalog_code = 'tipo-documento'
                  AND LOWER(TRIM(name)) LIKE 'ejemplo%'
                  AND (item_code IS NULL OR TRIM(item_code) = '')
                """);
            int nPro = jdbc.update("""
                UPDATE iso_9001_catalog_items
                SET item_code = 'PRO', updated_at = CURRENT_TIMESTAMP
                WHERE catalog_code = 'proceso'
                  AND LOWER(TRIM(name)) LIKE 'ejemplo%'
                  AND (item_code IS NULL OR TRIM(item_code) = '')
                """);
            if (nDoc > 0 || nPro > 0) {
                log.info("[Iso9001CatalogItemCodeSchemaGuard] Códigos semilla aplicados (DOC/PRO).");
            }
        } catch (Exception e) {
            log.warn("[Iso9001CatalogItemCodeSchemaGuard] seedExample: {}", e.getMessage());
        }
    }

    private Boolean tableExists(String table) {
        return jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = ?
                )
                """,
                Boolean.class,
                table
        );
    }

    private Boolean columnExists(String table, String column) {
        return jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = ?
                      AND column_name = ?
                )
                """,
                Boolean.class,
                table,
                column
        );
    }
}
