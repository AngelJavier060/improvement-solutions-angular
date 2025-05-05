package com.improvementsolutions.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/prueba")
public class PruebaController {

    @GetMapping
    public ResponseEntity<Map<String, String>> prueba() {
        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "API funcionando correctamente");
        return ResponseEntity.ok(response);
    }
}