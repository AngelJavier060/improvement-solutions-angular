package com.improvementsolutions.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
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

    @Autowired
    public DatabaseInfoUtil(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        System.out.println("\n==== INFORMACIÓN DE LA BASE DE DATOS ====");
        
        // Mostrar todas las tablas
        List<Map<String, Object>> tables = jdbcTemplate.queryForList("SHOW TABLES");
        
        System.out.println("\n=== TABLAS DISPONIBLES ===");
        tables.forEach(table -> {
            String tableName = table.values().iterator().next().toString();
            System.out.println("- " + tableName);
            
            // Para cada tabla, mostrar sus columnas
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

        // Verificar si existen tablas específicas de autenticación
        checkAuthTables("users");
        checkAuthTables("roles");
        checkAuthTables("permissions");
        checkAuthTables("user_roles");
    }

    private void checkAuthTables(String tableName) {
        try {
            List<Map<String, Object>> result = jdbcTemplate.queryForList(
                    "SELECT COUNT(*) as count FROM " + tableName);
            Long count = (Long) result.get(0).get("count");
            System.out.println("Tabla " + tableName + " existe y contiene " + count + " registros.");
        } catch (Exception e) {
            System.out.println("Tabla " + tableName + " no existe o no está accesible.");
        }
    }
}