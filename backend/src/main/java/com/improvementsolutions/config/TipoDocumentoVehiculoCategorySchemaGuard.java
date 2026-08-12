package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura la columna category en tipo_documento_vehiculos (grupos de documentación).
 * Evita HTTP 500 en /api/public/tipo-documento-vehiculos cuando la BD aún no tiene la columna.
 */
@Component
@Order(20)
@RequiredArgsConstructor
@Slf4j
public class TipoDocumentoVehiculoCategorySchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'tipo_documento_vehiculos'" +
                            "   AND column_name = 'category'" +
                            ")",
                    Boolean.class
            );
            if (Boolean.TRUE.equals(exists)) {
                jdbc.update(
                        "UPDATE tipo_documento_vehiculos" +
                                " SET category = 'DOCUMENTOS_PRINCIPALES'" +
                                " WHERE category IS NULL OR TRIM(category) = ''"
                );
                log.info("[TipoDocumentoCategoryGuard] Columna category OK.");
                return;
            }

            jdbc.execute(
                    "ALTER TABLE tipo_documento_vehiculos" +
                            " ADD COLUMN category VARCHAR(40) DEFAULT 'DOCUMENTOS_PRINCIPALES'"
            );
            jdbc.update(
                    "UPDATE tipo_documento_vehiculos" +
                            " SET category = 'DOCUMENTOS_PRINCIPALES'" +
                            " WHERE category IS NULL OR TRIM(category) = ''"
            );
            log.info("[TipoDocumentoCategoryGuard] Columna category creada en tipo_documento_vehiculos.");
        } catch (Exception e) {
            log.warn("[TipoDocumentoCategoryGuard] No se pudo asegurar columna category: {}", e.getMessage());
        }
    }
}
