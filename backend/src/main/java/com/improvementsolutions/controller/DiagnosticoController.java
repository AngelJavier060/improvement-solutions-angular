package com.improvementsolutions.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/diagnostico")
// Se eliminó CrossOrigin para usar la configuración centralizada en WebConfig
public class DiagnosticoController {

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "OK");
        status.put("message", "API funcionando correctamente");
        status.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/echo")
    public ResponseEntity<?> echo(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Datos recibidos correctamente");
        response.put("received", payload != null ? payload : "Sin datos");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}
