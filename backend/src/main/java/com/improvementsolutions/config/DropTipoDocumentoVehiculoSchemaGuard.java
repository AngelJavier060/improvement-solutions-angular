package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Elimina el catálogo de tipo de documento vehicular (redundante).
 * La documentación de flota usa solo entidad remitente + categoría.
 * Flyway está desactivado en local; Hibernate ddl-auto=update no borra tablas.
 */
@Component
@Order(22)
@RequiredArgsConstructor
@Slf4j
public class DropTipoDocumentoVehiculoSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name IN (" +
                            "     'tipo_documento_vehiculos'," +
                            "     'business_tipo_documento_vehiculo'," +
                            "     'tipo_vehiculo_documentos'" +
                            "   )" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(exists)) {
                return;
            }
            jdbc.execute("DROP TABLE IF EXISTS tipo_vehiculo_documentos");
            jdbc.execute("DROP TABLE IF EXISTS business_tipo_documento_vehiculo");
            jdbc.execute("DROP TABLE IF EXISTS tipo_documento_vehiculos");
            log.info("[DropTipoDocumentoVehiculo] Tablas de tipo documento vehículo eliminadas.");
        } catch (Exception e) {
            log.warn("[DropTipoDocumentoVehiculo] No se pudieron eliminar tablas: {}", e.getMessage());
        }
    }
}
