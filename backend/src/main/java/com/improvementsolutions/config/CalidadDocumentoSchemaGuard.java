package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura tabla {@code calidad_documentos} (lista maestra ISO 9001 por empresa).
 */
@Component
@Order(74)
@RequiredArgsConstructor
@Slf4j
public class CalidadDocumentoSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        ensureTable();
        ensureIndexes();
    }

    private void ensureTable() {
        try {
            if (Boolean.TRUE.equals(tableExists("calidad_documentos"))) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE calidad_documentos (
                    id                      BIGSERIAL PRIMARY KEY,
                    business_id             BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    parent_id               BIGINT NULL REFERENCES calidad_documentos(id) ON DELETE RESTRICT,
                    proceso_catalog_item_id BIGINT NULL,
                    proceso_name            VARCHAR(255) NOT NULL,
                    proceso_code            VARCHAR(10)  NOT NULL,
                    tipo_catalog_item_id    BIGINT NULL,
                    tipo_name               VARCHAR(255) NOT NULL,
                    tipo_code               VARCHAR(10)  NOT NULL,
                    codigo                  VARCHAR(100) NOT NULL,
                    nombre                  VARCHAR(500) NOT NULL,
                    fecha_elaboracion       DATE,
                    fecha_revision          DATE,
                    version                 VARCHAR(20)  NOT NULL DEFAULT '01',
                    fecha_prox_revision     DATE,
                    dias_vigencia           INTEGER,
                    estado                  VARCHAR(40)  NOT NULL DEFAULT 'VIGENTE',
                    almacenamiento          VARCHAR(255),
                    responsable             VARCHAR(255),
                    vigencia                VARCHAR(40),
                    disposicion_final       VARCHAR(255),
                    observaciones           TEXT,
                    file_name               VARCHAR(255),
                    file_path               VARCHAR(500),
                    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uk_calidad_documentos_business_codigo UNIQUE (business_id, codigo)
                )
                """);
            log.info("[CalidadDocumentoSchemaGuard] Tabla calidad_documentos creada.");
        } catch (Exception e) {
            log.warn("[CalidadDocumentoSchemaGuard] ensureTable: {}", e.getMessage());
        }
    }

    private void ensureIndexes() {
        try {
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_calidad_docs_business ON calidad_documentos(business_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_calidad_docs_parent ON calidad_documentos(parent_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_calidad_docs_business_parent ON calidad_documentos(business_id, parent_id)");
        } catch (Exception e) {
            log.warn("[CalidadDocumentoSchemaGuard] indexes: {}", e.getMessage());
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
}
