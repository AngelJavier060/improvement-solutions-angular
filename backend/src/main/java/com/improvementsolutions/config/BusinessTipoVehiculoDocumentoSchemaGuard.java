package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura business_tipo_vehiculo_documento cuando Flyway no corre en producción.
 */
@Component
@Order(22)
@RequiredArgsConstructor
@Slf4j
public class BusinessTipoVehiculoDocumentoSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'business_tipo_vehiculo_documento'" +
                            ")",
                    Boolean.class
            );
            if (Boolean.TRUE.equals(exists)) {
                log.info("[BizTipoVehiculoDocGuard] Tabla business_tipo_vehiculo_documento OK.");
                return;
            }

            jdbc.execute(
                    "CREATE TABLE business_tipo_vehiculo_documento (" +
                            " id BIGSERIAL PRIMARY KEY," +
                            " business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE," +
                            " tipo_vehiculo_id BIGINT NOT NULL REFERENCES tipo_vehiculos(id) ON DELETE CASCADE," +
                            " entidad_remitente_id BIGINT NOT NULL REFERENCES entidad_remitentes(id) ON DELETE CASCADE," +
                            " created_at TIMESTAMP," +
                            " updated_at TIMESTAMP," +
                            " CONSTRAINT uq_biz_tipo_vehiculo_doc UNIQUE (business_id, tipo_vehiculo_id, entidad_remitente_id)" +
                            ")"
            );
            jdbc.execute(
                    "CREATE INDEX IF NOT EXISTS idx_biz_tipo_veh_doc_lookup " +
                            "ON business_tipo_vehiculo_documento (business_id, tipo_vehiculo_id)"
            );
            log.info("[BizTipoVehiculoDocGuard] Tabla business_tipo_vehiculo_documento creada.");
        } catch (Exception e) {
            log.warn("[BizTipoVehiculoDocGuard] No se pudo asegurar la tabla: {}", e.getMessage());
        }
    }
}
