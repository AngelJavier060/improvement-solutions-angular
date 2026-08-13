package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(21)
@RequiredArgsConstructor
@Slf4j
public class EntidadRemitenteCategorySchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Boolean exists = jdbc.queryForObject(
                    "SELECT EXISTS (" +
                            " SELECT 1 FROM information_schema.columns" +
                            " WHERE table_schema = 'public'" +
                            "   AND table_name = 'entidad_remitentes'" +
                            "   AND column_name = 'category'" +
                            ")",
                    Boolean.class
            );
            if (!Boolean.TRUE.equals(exists)) {
                jdbc.execute(
                        "ALTER TABLE entidad_remitentes" +
                                " ADD COLUMN category VARCHAR(40) DEFAULT 'DOCUMENTOS_PRINCIPALES'"
                );
                log.info("[EntidadRemitenteCategoryGuard] Columna category creada.");
            }
            jdbc.update(
                    "UPDATE entidad_remitentes" +
                            " SET category = 'DOCUMENTOS_PRINCIPALES'" +
                            " WHERE category IS NULL OR TRIM(category) = ''"
            );
        } catch (Exception e) {
            log.warn("[EntidadRemitenteCategoryGuard] No se pudo asegurar columna category: {}", e.getMessage());
        }
    }
}
