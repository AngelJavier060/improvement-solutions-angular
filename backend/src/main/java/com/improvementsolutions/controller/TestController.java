package com.improvementsolutions.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.improvementsolutions.repository.UserRepository;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/test")
// Se elimina CrossOrigin para usar la configuración centralizada en WebConfig
public class TestController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/db-connection")
    public ResponseEntity<?> testDbConnection() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Intentar contar usuarios para probar la conexión
            long userCount = userRepository.count();
            response.put("status", "success");
            response.put("message", "Conexión a base de datos exitosa");
            response.put("userCount", userCount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error de conexión a base de datos: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(status);
    }
}
