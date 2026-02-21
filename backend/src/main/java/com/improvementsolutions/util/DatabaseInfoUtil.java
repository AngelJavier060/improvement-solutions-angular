package com.improvementsolutions.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Utilidad para mostrar información sobre la estructura de la base de datos
 * durante el inicio de la aplicación Spring Boot.
 */
@Component
public class DatabaseInfoUtil implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final Environment environment;

    @Autowired
    public DatabaseInfoUtil(JdbcTemplate jdbcTemplate, Environment environment) {
        this.jdbcTemplate = jdbcTemplate;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        // Solo ejecutar en el perfil de desarrollo
        if (!isTestProfile()) {
            System.out.println("\n==== INFORMACIÓN DE LA BASE DE DATOS ====");
            
            // Consultas específicas para H2 o PostgreSQL
            if (isH2Database()) {
                showH2Tables();
            } else if (isPostgresDatabase()) {
                showPostgresTables();
            } else {
                System.out.println("Base de datos no soportada por DatabaseInfoUtil");
            }
        }
    }

    private boolean isTestProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        for (String profile : activeProfiles) {
            if (profile.equals("test")) {
                return true;
            }
        }
        return false;
    }

    private boolean isH2Database() {
        String url = environment.getProperty("spring.datasource.url", "");
        return url.contains("h2");
    }

    private boolean isPostgresDatabase() {
        String url = environment.getProperty("spring.datasource.url", "");
        return url.contains("postgresql");
    }

    private void showH2Tables() {
        List<Map<String, Object>> tables = jdbcTemplate.queryForList(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'");
        
        System.out.println("\n=== TABLAS DISPONIBLES ===");
        tables.forEach(table -> {
            String tableName = table.get("TABLE_NAME").toString();
            System.out.println("- " + tableName);
            
            // Para cada tabla, mostrar sus columnas usando la sintaxis de H2
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME, TYPE_NAME, IS_NULLABLE, COLUMN_DEFAULT, " +
                "CASE WHEN SEQUENCE_NAME IS NOT NULL THEN 'PRI' ELSE '' END AS KEY " +
                "FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_NAME = ?", tableName);
            
            System.out.println("  Columnas:");
            columns.forEach(column -> {
                String columnName = column.get("COLUMN_NAME").toString();
                String columnType = column.get("TYPE_NAME").toString();
                String columnKey = column.get("KEY").toString();
                System.out.println("    - " + columnName + " (" + columnType + ")" +
                        (columnKey.equals("PRI") ? " [PK]" : ""));
            });
            System.out.println();
        });
    }

    private void showPostgresTables() {
        List<Map<String, Object>> tables = jdbcTemplate.queryForList(
                "SELECT table_name " +
                "FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' " +
                "ORDER BY table_name");

        System.out.println("\n=== TABLAS DISPONIBLES ===");
        tables.forEach(table -> {
            String tableName = table.get("table_name").toString();
            System.out.println("- " + tableName);

            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                    "SELECT column_name, data_type, is_nullable, column_default " +
                    "FROM information_schema.columns " +
                    "WHERE table_schema = 'public' AND table_name = ? " +
                    "ORDER BY ordinal_position",
                    tableName);

            System.out.println("  Columnas:");
            columns.forEach(column -> {
                String columnName = column.get("column_name").toString();
                String columnType = column.get("data_type").toString();
                Object defaultValue = column.get("column_default");
                String nullable = column.get("is_nullable").toString();
                System.out.println("    - " + columnName + " (" + columnType + ")" +
                        ("NO".equalsIgnoreCase(nullable) ? " NOT NULL" : "") +
                        (defaultValue != null ? " DEFAULT " + defaultValue : ""));
            });
            System.out.println();
        });
    }
}
