package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura tabla cambio_epp_solicitudes si Flyway aún no corrió en el entorno.
 */
@Component
@Order(62)
@RequiredArgsConstructor
@Slf4j
public class CambioEppSolicitudSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'cambio_epp_solicitudes'" +
                            ")",
                    Boolean.class
            );
            if (Boolean.TRUE.equals(tableExists)) {
                return;
            }
            jdbc.execute("""
                CREATE TABLE cambio_epp_solicitudes (
                    id                  BIGSERIAL PRIMARY KEY,
                    business_id         BIGINT NOT NULL REFERENCES businesses(id),
                    n_reporte           VARCHAR(40) NOT NULL,
                    trabajador          VARCHAR(200) NOT NULL,
                    cedula              VARCHAR(20) NOT NULL,
                    cargo               VARCHAR(150),
                    area                VARCHAR(200),
                    tipo_acontecimiento VARCHAR(120),
                    section_code        VARCHAR(10),
                    section_label       VARCHAR(80),
                    estado_epi          VARCHAR(120),
                    severidad           VARCHAR(40),
                    fecha_elaboracion   VARCHAR(40),
                    status              VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_APROBACION',
                    form_snapshot       TEXT,
                    signed_file_name    VARCHAR(255),
                    signed_file_path    VARCHAR(500),
                    signed_uploaded_at  TIMESTAMP,
                    output_id           BIGINT,
                    output_number       VARCHAR(50),
                    delivered_at        TIMESTAMP,
                    rejected_reason     TEXT,
                    rejected_at         TIMESTAMP,
                    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_cambio_epp_business ON cambio_epp_solicitudes(business_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_cambio_epp_status ON cambio_epp_solicitudes(business_id, status)");
            log.info("[CambioEppSolicitudSchemaGuard] Tabla cambio_epp_solicitudes creada.");
        } catch (Exception e) {
            log.warn("[CambioEppSolicitudSchemaGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }
}
