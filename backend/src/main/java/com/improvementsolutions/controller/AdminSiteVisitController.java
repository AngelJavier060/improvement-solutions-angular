package com.improvementsolutions.controller;

import com.improvementsolutions.service.SiteVisitCounterService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Consulta de auditoría de visitas (solo administradores).
 */
@RestController
@RequestMapping("/api/admin/site-visits")
public class AdminSiteVisitController {

    private final SiteVisitCounterService visitService;

    public AdminSiteVisitController(SiteVisitCounterService visitService) {
        this.visitService = visitService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getRecent(
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        return ResponseEntity.ok(visitService.getAdminOverview(limit));
    }
}
