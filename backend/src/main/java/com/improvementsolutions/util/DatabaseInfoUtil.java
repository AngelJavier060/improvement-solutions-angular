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
            
            // Consulta específica para H2
            if (isH2Database()) {
                showH2Tables();
            } else {
                // Consulta para MySQL
                showMySQLTables();
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

    private void showMySQLTables() {
        List<Map<String, Object>> tables = jdbcTemplate.queryForList("SHOW TABLES");
        
        System.out.println("\n=== TABLAS DISPONIBLES ===");
        tables.forEach(table -> {
            String tableName = table.values().iterator().next().toString();
            System.out.println("- " + tableName);
            
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                    "DESCRIBE " + tableName);
            
            System.out.println("  Columnas:");
            columns.forEach(column -> {
                String columnName = column.get("Field").toString();
                String columnType = column.get("Type").toString();
                String columnKey = column.get("Key").toString();
                System.out.println("    - " + columnName + " (" + columnType + ")" +
                        (columnKey.equals("PRI") ? " [PK]" : ""));
            });
            System.out.println();
        });
    }
}
