package com.improvementsolutions.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para validar si los endpoints públicos funcionan correctamente
 * después de las correcciones realizadas.
 */
@RestController
@RequestMapping("/api/public/validacion")
public class SolucionProblemaController {
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> validarEndpointPublico() {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "El endpoint público funciona correctamente");
        respuesta.put("fecha", LocalDateTime.now().toString());
        respuesta.put("descripcion", "Este endpoint está configurado para ser accesible sin autenticación");
        
        return ResponseEntity.ok(respuesta);
    }
    
    @GetMapping("/cors")
    public ResponseEntity<Map<String, Object>> validarCors() {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "La configuración CORS funciona correctamente");
        respuesta.put("fecha", LocalDateTime.now().toString());
        respuesta.put("descripcion", "Este endpoint verifica que la configuración CORS centralizada esté funcionando");
        
        return ResponseEntity.ok(respuesta);
    }
}
