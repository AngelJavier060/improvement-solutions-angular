package com.improvementsolutions.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

// @RestController - DESACTIVADO para evitar conflicto con PublicTestController
// Ambos controladores intentaban manejar la misma ruta /public/test
@Component
@RequestMapping("/public/test-alt") // Cambiada la ruta para evitar conflicto
// IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
public class TestPublicController {    @GetMapping
    public ResponseEntity<?> testPublicAccess() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Este endpoint público funciona correctamente");
        response.put("status", "success");
        
        // Ya no necesitamos agregar encabezados CORS manualmente
        // porque usamos la configuración centralizada en ImprovementSolutionsApplication
        return ResponseEntity.ok(response);
    }
}
