package com.improvementsolutions.controller;

import com.improvementsolutions.service.BusinessService;
import com.improvementsolutions.service.SiteVisitCounterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Contadores públicos de la landing (solo totales, sin datos sensibles).
 * El detalle IP/navegador NO se expone aquí; solo en endpoint admin.
 */
@RestController
@RequestMapping("/api/public/site-visits")
public class PublicSiteVisitController {

    private final SiteVisitCounterService visitService;
    private final BusinessService businessService;

    public PublicSiteVisitController(SiteVisitCounterService visitService, BusinessService businessService) {
        this.visitService = visitService;
        this.businessService = businessService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getTotal() {
        return ResponseEntity.ok(buildResponse(visitService.getTotal(SiteVisitCounterService.LANDING_KEY)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> registerVisit(HttpServletRequest request) {
        long total = visitService.increment(SiteVisitCounterService.LANDING_KEY);
        visitService.logVisitSafe(request);
        return ResponseEntity.ok(buildResponse(total));
    }

    private Map<String, Object> buildResponse(long visits) {
        Map<String, Object> body = new HashMap<>();
        body.put("total", visits);
        body.put("key", SiteVisitCounterService.LANDING_KEY);
        Long companies = businessService.countActiveBusinesses();
        body.put("companiesActive", companies == null ? 0L : companies);
        return body;
    }
}
