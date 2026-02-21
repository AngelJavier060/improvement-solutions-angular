package com.improvementsolutions.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/db")
public class DbDiagnosticsController {

    @PersistenceContext
    private EntityManager em;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @GetMapping("/diagnostics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> diagnostics() {
        Map<String, Object> out = new HashMap<>();

        String dbNameSql = datasourceUrl != null && datasourceUrl.contains("postgresql")
                ? "SELECT current_database()"
                : "SELECT DATABASE()";
        Object dbName = em.createNativeQuery(dbNameSql).getSingleResult();
        Object businessCount = em.createNativeQuery("SELECT COUNT(*) FROM businesses").getSingleResult();
        @SuppressWarnings("unchecked")
        List<Object[]> sample = em.createNativeQuery("SELECT id, name FROM businesses ORDER BY id LIMIT 50").getResultList();

        out.put("datasourceUrl", datasourceUrl);
        out.put("database", dbName);
        out.put("businessesCount", businessCount);

        // Mapear resultados a objetos simples
        List<Map<String, Object>> businesses = sample.stream().map(row -> {
            Map<String, Object> r = new HashMap<>();
            r.put("id", ((Number) row[0]).longValue());
            r.put("name", row[1]);
            return r;
        }).toList();
        out.put("businesses", businesses);

        return ResponseEntity.ok(out);
    }
}
