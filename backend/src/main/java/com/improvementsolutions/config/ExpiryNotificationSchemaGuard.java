package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(26)
@RequiredArgsConstructor
@Slf4j
public class ExpiryNotificationSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean colExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'businesses'" +
                            "   AND column_name = 'expiry_notification_config'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(colExists)) {
                jdbc.execute("ALTER TABLE businesses ADD COLUMN expiry_notification_config TEXT");
                log.info("[ExpiryNotificationGuard] Columna expiry_notification_config creada.");
            }

            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'expiry_alert_sent'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) {
                jdbc.execute(
                        "CREATE TABLE expiry_alert_sent (" +
                                " id BIGSERIAL PRIMARY KEY," +
                                " business_id BIGINT NOT NULL REFERENCES businesses(id)," +
                                " source_type VARCHAR(40) NOT NULL," +
                                " source_id BIGINT NOT NULL," +
                                " threshold_days INTEGER NOT NULL," +
                                " expiry_date DATE," +
                                " sent_at TIMESTAMP," +
                                " CONSTRAINT uk_expiry_alert_sent UNIQUE (business_id, source_type, source_id, threshold_days)" +
                                ")"
                );
                log.info("[ExpiryNotificationGuard] Tabla expiry_alert_sent creada.");
            }
        } catch (Exception e) {
            log.warn("[ExpiryNotificationGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }
}
