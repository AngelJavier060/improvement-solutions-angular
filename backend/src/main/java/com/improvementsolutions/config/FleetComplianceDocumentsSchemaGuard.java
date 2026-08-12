package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura la tabla fleet_compliance_documents cuando Flyway no corre en producción.
 */
@Component
@Order(21)
@RequiredArgsConstructor
@Slf4j
public class FleetComplianceDocumentsSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'fleet_compliance_documents'" +
                            ")",
                    Boolean.class
            );
            if (Boolean.TRUE.equals(exists)) {
                log.info("[FleetComplianceGuard] Tabla fleet_compliance_documents OK.");
                return;
            }

            jdbc.execute(
                    "CREATE TABLE fleet_compliance_documents (" +
                            " id BIGSERIAL PRIMARY KEY," +
                            " fleet_vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE," +
                            " type_code VARCHAR(100) NOT NULL," +
                            " type_label VARCHAR(255) NOT NULL," +
                            " doc_category VARCHAR(50) DEFAULT 'DOCUMENTOS_PRINCIPALES'," +
                            " entidad_remitente_id BIGINT," +
                            " entidad_remitente_name VARCHAR(255)," +
                            " reference_id VARCHAR(120)," +
                            " issue_date DATE," +
                            " expiry_date DATE," +
                            " active BOOLEAN NOT NULL DEFAULT TRUE," +
                            " historic_mode BOOLEAN NOT NULL DEFAULT FALSE," +
                            " file_name VARCHAR(512)," +
                            " file_size_label VARCHAR(64)," +
                            " fleet_vehicle_document_id BIGINT REFERENCES fleet_vehicle_documents(id) ON DELETE SET NULL," +
                            " created_at TIMESTAMP," +
                            " updated_at TIMESTAMP" +
                            ")"
            );
            jdbc.execute(
                    "CREATE INDEX IF NOT EXISTS idx_fleet_compliance_vehicle " +
                            "ON fleet_compliance_documents(fleet_vehicle_id)"
            );
            jdbc.execute(
                    "CREATE INDEX IF NOT EXISTS idx_fleet_compliance_doc_file " +
                            "ON fleet_compliance_documents(fleet_vehicle_document_id)"
            );
            log.info("[FleetComplianceGuard] Tabla fleet_compliance_documents creada.");
        } catch (Exception e) {
            log.warn("[FleetComplianceGuard] No se pudo asegurar fleet_compliance_documents: {}", e.getMessage());
        }
    }
}
