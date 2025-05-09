package com.improvementsolutions.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.HashMap;
import java.util.Map;
import java.time.LocalDateTime;

/**
 * Controlador para pruebas de acceso público
 * Este controlador expone endpoints que ayudan a diagnosticar problemas con endpoints públicos
 * IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
 */
@RestController
@RequestMapping("/public/test")
// @CrossOrigin eliminado - usamos la configuración centralizada en ImprovementSolutionsApplication
public class PublicTestController {

    /**
     * Endpoint de prueba básica que devuelve un mensaje simple
     */
    @GetMapping
    public ResponseEntity<?> testPublicAccess() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Este endpoint público funciona correctamente");
        response.put("status", "success");
        response.put("timestamp", LocalDateTime.now().toString());
          // Ya no necesitamos agregar encabezados CORS manualmente
        // porque usamos la configuración centralizada en ImprovementSolutionsApplication
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint para probar tipos específicos de respuestas públicas
     * Permite verificar cómo maneja el cliente diferentes códigos de estado HTTP
     */
    @GetMapping("/status/{statusCode}")
    public ResponseEntity<?> testStatusCode(@PathVariable int statusCode) {
        Map<String, Object> response = new HashMap<>();
        response.put("requestedStatus", statusCode);
        response.put("timestamp", LocalDateTime.now().toString());
        
        HttpStatus status;
        try {
            status = HttpStatus.valueOf(statusCode);
        } catch (IllegalArgumentException e) {
            status = HttpStatus.OK;
            response.put("message", "Código de estado inválido, usando 200 OK");
        }
        
        response.put("statusText", status.getReasonPhrase());
          // Ya no necesitamos agregar encabezados CORS manualmente
        return ResponseEntity
            .status(status)
            .body(response);
    }
    
    /**
     * Endpoint para probar headers personalizados
     */
    @GetMapping("/headers")
    public ResponseEntity<?> testHeaders() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Endpoint con headers personalizados");
        response.put("timestamp", LocalDateTime.now().toString());
          // Solo conservamos los headers personalizados, eliminamos los de CORS
        return ResponseEntity.ok()
            .header("X-Test-Header", "TestValue")
            .header("Custom-Header", "PublicEndpointTest")
            .body(response);
    }
}
