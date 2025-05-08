package com.improvementsolutions.controller;

import com.improvementsolutions.dto.auth.LoginRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto;
import com.improvementsolutions.dto.auth.RegisterRequestDto;
import com.improvementsolutions.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador para la autenticación de usuarios
 */
@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Maneja las solicitudes de inicio de sesión
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto loginRequest) {
        LoginResponseDto response = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Maneja las solicitudes de registro de usuario
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequestDto registerRequest) {
        try {
            authService.registerUser(registerRequest);
            return ResponseEntity.ok().body("Usuario registrado exitosamente");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}