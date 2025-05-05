package com.improvementsolutions.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/generos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PublicGeneroController {

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllGeneros() {
        // Crear datos de ejemplo estáticos
        Map<String, Object> masculino = new HashMap<>();
        masculino.put("id", 1L);
        masculino.put("name", "Masculino");
        masculino.put("description", "Género masculino");
        masculino.put("createdAt", LocalDateTime.now());
        masculino.put("updatedAt", LocalDateTime.now());
        
        Map<String, Object> femenino = new HashMap<>();
        femenino.put("id", 2L);
        femenino.put("name", "Femenino");
        femenino.put("description", "Género femenino");
        femenino.put("createdAt", LocalDateTime.now());
        femenino.put("updatedAt", LocalDateTime.now());
        
        Map<String, Object> otro = new HashMap<>();
        otro.put("id", 3L);
        otro.put("name", "Otro");
        otro.put("description", "Otro género");
        otro.put("createdAt", LocalDateTime.now());
        otro.put("updatedAt", LocalDateTime.now());
        
        return ResponseEntity.ok(Arrays.asList(masculino, femenino, otro));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getGeneroById(@PathVariable Long id) {
        // Crear datos de ejemplo estáticos basados en el ID
        Map<String, Object> genero = new HashMap<>();
        genero.put("id", id);
        
        if (id == 1L) {
            genero.put("name", "Masculino");
            genero.put("description", "Género masculino");
        } else if (id == 2L) {
            genero.put("name", "Femenino");
            genero.put("description", "Género femenino");
        } else if (id == 3L) {
            genero.put("name", "Otro");
            genero.put("description", "Otro género");
        } else {
            return ResponseEntity.notFound().build();
        }
        
        genero.put("createdAt", LocalDateTime.now());
        genero.put("updatedAt", LocalDateTime.now());
        
        return ResponseEntity.ok(genero);
    }
}