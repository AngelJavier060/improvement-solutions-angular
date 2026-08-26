package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(27)
@RequiredArgsConstructor
@Slf4j
public class UserOperationalCapabilitySchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'user_operational_capabilities'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) {
                jdbc.execute(
                        "CREATE TABLE user_operational_capabilities (" +
                                " id BIGSERIAL PRIMARY KEY," +
                                " user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE," +
                                " can_view BOOLEAN NOT NULL DEFAULT TRUE," +
                                " can_download BOOLEAN NOT NULL DEFAULT TRUE," +
                                " can_create BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_edit BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_delete BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_upload BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_overtime BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_vacations BOOLEAN NOT NULL DEFAULT FALSE," +
                                " can_time_off BOOLEAN NOT NULL DEFAULT FALSE," +
                                " created_at TIMESTAMP," +
                                " updated_at TIMESTAMP" +
                                ")"
                );
                log.info("[UserOperationalCapabilityGuard] Tabla user_operational_capabilities creada.");
            } else {
                ensureColumn("can_overtime", "BOOLEAN NOT NULL DEFAULT FALSE");
                ensureColumn("can_vacations", "BOOLEAN NOT NULL DEFAULT FALSE");
                ensureColumn("can_time_off", "BOOLEAN NOT NULL DEFAULT FALSE");
            }
        } catch (Exception e) {
            log.warn("[UserOperationalCapabilityGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private void ensureColumn(String column, String definition) {
        try {
            Boolean colExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'user_operational_capabilities'" +
                            "   AND column_name = ?" +
                            ")",
                    Boolean.class,
                    column
            );
            if (!Boolean.TRUE.equals(colExists)) {
                jdbc.execute("ALTER TABLE user_operational_capabilities ADD COLUMN " + column + " " + definition);
                log.info("[UserOperationalCapabilityGuard] Columna {} agregada.", column);
            }
        } catch (Exception e) {
            log.warn("[UserOperationalCapabilityGuard] No se pudo agregar columna {}: {}", column, e.getMessage());
        }
    }
}
