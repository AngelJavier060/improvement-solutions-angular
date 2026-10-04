package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(5)
@RequiredArgsConstructor
@Slf4j
public class BusinessBirthdaySchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean tableExists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.tables" +
                            " WHERE table_schema = 'public' AND table_name = 'businesses'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(tableExists)) return;
            ensureColumn("birthday_greeting_enabled", "BOOLEAN DEFAULT FALSE");
            ensureColumn("birthday_greeting_message", "VARCHAR(500)");
            ensureColumn("birthday_greeting_show_photo", "BOOLEAN DEFAULT TRUE");
            ensureMailSentTable();
        } catch (Exception e) {
            log.warn("[BusinessBirthdayGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private void ensureColumn(String column, String type) {
        Boolean colExists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.columns" +
                        " WHERE table_schema = 'public'" +
                        "   AND table_name = 'businesses'" +
                        "   AND column_name = ?" +
                        ")",
                Boolean.class,
                column
        );
        if (!Boolean.TRUE.equals(colExists)) {
            jdbc.execute("ALTER TABLE businesses ADD COLUMN " + column + " " + type);
            log.info("[BusinessBirthdayGuard] Columna {} agregada.", column);
        }
    }

    private void ensureMailSentTable() {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        " SELECT 1 FROM information_schema.tables" +
                        " WHERE table_schema = 'public' AND table_name = 'birthday_greeting_mail_sent'" +
                        ")",
                Boolean.class
        );
        if (Boolean.TRUE.equals(exists)) return;
        jdbc.execute(
                "CREATE TABLE birthday_greeting_mail_sent (" +
                        " id BIGSERIAL PRIMARY KEY," +
                        " business_id BIGINT NOT NULL REFERENCES businesses(id)," +
                        " employee_id BIGINT NOT NULL," +
                        " sent_date DATE NOT NULL," +
                        " slot INTEGER NOT NULL," +
                        " email_to VARCHAR(180)," +
                        " sent_at TIMESTAMP," +
                        " CONSTRAINT uk_birthday_mail_sent UNIQUE (employee_id, sent_date, slot)" +
                        ")"
        );
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_birthday_mail_sent_biz_date ON birthday_greeting_mail_sent (business_id, sent_date)");
        log.info("[BusinessBirthdayGuard] Tabla birthday_greeting_mail_sent creada.");
    }
}
