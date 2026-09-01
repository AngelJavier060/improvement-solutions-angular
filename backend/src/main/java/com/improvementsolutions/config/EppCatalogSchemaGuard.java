package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura tablas epp_families / epp_sections (incl. columna code).
 * Cada paso se aísla para que un fallo de índice no revierta el ALTER.
 */
@Component
@Order(63)
@RequiredArgsConstructor
@Slf4j
public class EppCatalogSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureTableFamilies();
        ensureTableSections();
        ensureCodeColumn("epp_families");
        ensureCodeColumn("epp_sections");
        backfillFamilyCodes();
        backfillSectionCodes();
        ensureUniqueIndex("epp_families", "uk_epp_families_code");
        ensureUniqueIndex("epp_sections", "uk_epp_sections_code");
        seedFamiliesIfEmpty();
        seedSectionsIfEmpty();
    }

    private void ensureTableFamilies() {
        try {
            if (Boolean.TRUE.equals(tableExists("epp_families"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE epp_families (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(80)  NOT NULL,
                    code        VARCHAR(4),
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_families_name_ci ON epp_families (LOWER(TRIM(name)))");
            log.info("[EppCatalogSchemaGuard] Tabla epp_families creada.");
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] ensureTableFamilies: {}", e.getMessage());
        }
    }

    private void ensureTableSections() {
        try {
            if (Boolean.TRUE.equals(tableExists("epp_sections"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE epp_sections (
                    id          BIGSERIAL PRIMARY KEY,
                    name        VARCHAR(80)  NOT NULL,
                    code        VARCHAR(4),
                    description VARCHAR(255),
                    active      BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_sections_name_ci ON epp_sections (LOWER(TRIM(name)))");
            log.info("[EppCatalogSchemaGuard] Tabla epp_sections creada.");
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] ensureTableSections: {}", e.getMessage());
        }
    }

    private void ensureCodeColumn(String table) {
        try {
            Boolean hasCode = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = ?" +
                            "   AND column_name = 'code'" +
                            ")",
                    Boolean.class,
                    table
            );
            if (!Boolean.TRUE.equals(hasCode)) {
                jdbc.execute("ALTER TABLE " + table + " ADD COLUMN code VARCHAR(4)");
                log.info("[EppCatalogSchemaGuard] Columna code agregada a {}.", table);
            }
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] ensureCodeColumn({}): {}", table, e.getMessage());
        }
    }

    private void ensureUniqueIndex(String table, String indexName) {
        try {
            // Índice simple sobre code (valores ya normalizados a mayúsculas)
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS " + indexName + " ON " + table + " (code)");
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] ensureUniqueIndex({}): {}", indexName, e.getMessage());
        }
    }

    private void backfillFamilyCodes() {
        try {
            jdbc.update("""
                UPDATE epp_families SET code = 'EPP'
                WHERE (code IS NULL OR TRIM(code) = '')
                  AND UPPER(TRIM(name)) IN ('EPP', 'EQUIPO DE PROTECCION PERSONAL', 'EQUIPO DE PROTECCIÓN PERSONAL')
                """);
            jdbc.update("""
                UPDATE epp_families SET code = 'HER'
                WHERE (code IS NULL OR TRIM(code) = '')
                  AND UPPER(TRIM(name)) LIKE 'HERRAMIENT%'
                """);
            jdbc.update("""
                UPDATE epp_families SET code = 'PIE'
                WHERE (code IS NULL OR TRIM(code) = '')
                  AND UPPER(TRIM(name)) LIKE 'PIEZA%'
                """);
            jdbc.update("""
                UPDATE epp_families
                SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))
                WHERE code IS NULL OR TRIM(code) = ''
                """);
            // Evitar códigos duplicados tras backfill genérico
            jdbc.update("""
                UPDATE epp_families f
                SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(f.name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 2))
                          || SUBSTRING(f.id::text FROM LENGTH(f.id::text) FOR 1)
                WHERE f.code IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM epp_families o
                    WHERE o.id < f.id AND UPPER(TRIM(o.code)) = UPPER(TRIM(f.code))
                  )
                """);
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] backfillFamilyCodes: {}", e.getMessage());
        }
    }

    private void backfillSectionCodes() {
        try {
            jdbc.update("""
                UPDATE epp_sections SET code = CASE UPPER(TRIM(name))
                    WHEN 'CASCO' THEN 'CAS'
                    WHEN 'PANTALÓN' THEN 'PAN'
                    WHEN 'PANTALON' THEN 'PAN'
                    WHEN 'CAMISA' THEN 'CAM'
                    WHEN 'OVEROL' THEN 'OVE'
                    WHEN 'GUANTES' THEN 'GUA'
                    WHEN 'BOTAS' THEN 'BOT'
                    WHEN 'RESPIRADOR' THEN 'RES'
                    WHEN 'ARNÉS' THEN 'ARN'
                    WHEN 'ARNES' THEN 'ARN'
                    WHEN 'OTRO EPP' THEN 'OTR'
                    ELSE code
                END
                WHERE code IS NULL OR TRIM(code) = ''
                """);
            jdbc.update("""
                UPDATE epp_sections
                SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))
                WHERE code IS NULL OR TRIM(code) = ''
                """);
            jdbc.update("""
                UPDATE epp_sections s
                SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(s.name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 2))
                          || SUBSTRING(s.id::text FROM LENGTH(s.id::text) FOR 1)
                WHERE s.code IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM epp_sections o
                    WHERE o.id < s.id AND UPPER(TRIM(o.code)) = UPPER(TRIM(s.code))
                  )
                """);
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] backfillSectionCodes: {}", e.getMessage());
        }
    }

    private void seedFamiliesIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM epp_families", Integer.class);
            if (count != null && count == 0) {
                jdbc.update("INSERT INTO epp_families (name, code, description, active) VALUES (?, ?, ?, TRUE)",
                        "EPP", "EPP", "Equipos de protección personal");
            }
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] seedFamiliesIfEmpty: {}", e.getMessage());
        }
    }

    private void seedSectionsIfEmpty() {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM epp_sections", Integer.class);
            if (count == null || count > 0) {
                return;
            }
            Object[][] seeds = {
                    {"Casco", "CAS", "Protección craneal"},
                    {"Pantalón", "PAN", "Prenda inferior de trabajo"},
                    {"Camisa", "CAM", "Prenda superior de trabajo"},
                    {"Overol", "OVE", "Traje de protección completo"},
                    {"Guantes", "GUA", "Protección de manos"},
                    {"Botas", "BOT", "Calzado de seguridad"},
                    {"Respirador", "RES", "Protección respiratoria"},
                    {"Arnés", "ARN", "Protección contra caídas"},
                    {"Otro EPP", "OTR", "Otros elementos de protección"}
            };
            for (Object[] row : seeds) {
                jdbc.update("INSERT INTO epp_sections (name, code, description, active) VALUES (?, ?, ?, TRUE)",
                        row[0], row[1], row[2]);
            }
        } catch (Exception e) {
            log.warn("[EppCatalogSchemaGuard] seedSectionsIfEmpty: {}", e.getMessage());
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
