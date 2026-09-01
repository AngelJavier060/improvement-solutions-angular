package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura tablas de asignación empresa ↔ Familia/Sección (Inventario-Bodega).
 */
@Component
@Order(65)
@RequiredArgsConstructor
@Slf4j
public class BusinessEppCatalogSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureJoin(
                "business_epp_family",
                """
                CREATE TABLE business_epp_family (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    epp_family_id BIGINT NOT NULL REFERENCES epp_families(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, epp_family_id)
                )
                """,
                "idx_business_epp_family_biz",
                "business_id"
        );
            ensureJoin(
                "business_epp_section",
                """
                CREATE TABLE business_epp_section (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    epp_section_id BIGINT NOT NULL REFERENCES epp_sections(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, epp_section_id)
                )
                """,
                "idx_business_epp_section_biz",
                "business_id"
        );
        ensureSupplierJoin();
    }

    private void ensureJoin(String table, String createSql, String indexName, String indexCol) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public' AND table_name = ?" +
                            ")",
                    Boolean.class,
                    table
            );
            if (!Boolean.TRUE.equals(exists)) {
                jdbc.execute(createSql);
                jdbc.execute("CREATE INDEX IF NOT EXISTS " + indexName + " ON " + table + "(" + indexCol + ")");
                log.info("[BusinessEppCatalogSchemaGuard] Tabla {} creada.", table);
            }
        } catch (Exception e) {
            log.warn("[BusinessEppCatalogSchemaGuard] {}: {}", table, e.getMessage());
        }
    }

    private void ensureSupplierJoin() {
        ensureJoin(
                "business_inventory_supplier_global",
                """
                CREATE TABLE business_inventory_supplier_global (
                    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    inventory_supplier_global_id BIGINT NOT NULL REFERENCES inventory_supplier_catalog(id) ON DELETE CASCADE,
                    PRIMARY KEY (business_id, inventory_supplier_global_id)
                )
                """,
                "idx_biz_inv_sup_global_biz",
                "business_id"
        );
    }
}
