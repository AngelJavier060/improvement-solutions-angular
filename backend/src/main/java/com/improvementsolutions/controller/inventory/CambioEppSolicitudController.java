package com.improvementsolutions.controller.inventory;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.service.inventory.CambioEppSolicitudService;

@RestController
@RequestMapping("/api/inventory/{ruc}/cambio-epp")
public class CambioEppSolicitudController {

    private final CambioEppSolicitudService service;

    public CambioEppSolicitudController(CambioEppSolicitudService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> list(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(service.list(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/pendientes-entrega")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> pendientes(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(service.listPendientesEntrega(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/tipos-acontecimiento")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> tiposAcontecimiento(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(service.listAcontecimientoTypesForBusiness(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/estados-epi")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> estadosEpi(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(service.listEstadoEpiForBusiness(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/next-report-number")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> nextReport(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(service.nextReportNumber(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> get(@PathVariable String ruc, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getById(ruc, id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> create(@PathVariable String ruc, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(service.create(ruc, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/en-espera-inventario")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> enEspera(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(service.markEnEsperaInventario(ruc, id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/entregado")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> entregado(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            return ResponseEntity.ok(service.markEntregado(ruc, id, body == null ? Map.of() : body));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> rechazar(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(service.markRechazado(ruc, id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }
}
