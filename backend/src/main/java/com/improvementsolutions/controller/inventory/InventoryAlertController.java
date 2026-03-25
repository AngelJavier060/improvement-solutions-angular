package com.improvementsolutions.controller.inventory;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.service.inventory.InventoryAlertService;

@RestController
@RequestMapping("/api/inventory/{ruc}")
public class InventoryAlertController {

    private final InventoryAlertService alertService;

    public InventoryAlertController(InventoryAlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<?> getAlerts(@PathVariable String ruc) {
        try {
            Map<String, Object> alerts = alertService.getAlerts(ruc);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }
}
