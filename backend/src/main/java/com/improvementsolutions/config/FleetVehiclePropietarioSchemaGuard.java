package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura la columna propietario en fleet_vehicles (Flyway suele estar desactivado).
 */
@Component
@Order(23)
@RequiredArgsConstructor
@Slf4j
public class FleetVehiclePropietarioSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'fleet_vehicles'" +
                            "   AND column_name = 'propietario'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(exists)) {
                jdbc.execute("ALTER TABLE fleet_vehicles ADD COLUMN propietario VARCHAR(255)");
                log.info("[FleetVehiclePropietarioGuard] Columna propietario creada.");
            }
        } catch (Exception e) {
            log.warn("[FleetVehiclePropietarioGuard] No se pudo asegurar columna propietario: {}", e.getMessage());
        }
    }
}
