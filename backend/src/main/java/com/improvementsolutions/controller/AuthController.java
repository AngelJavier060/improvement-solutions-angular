package com.improvementsolutions.controller;

import com.improvementsolutions.dto.auth.LoginRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto;
import com.improvementsolutions.dto.auth.RegisterRequestDto;
import com.improvementsolutions.dto.auth.PasswordChangeDto;
import com.improvementsolutions.dto.auth.PasswordResetRequestDto;
import com.improvementsolutions.dto.auth.PasswordResetDto;
import com.improvementsolutions.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para la autenticación de usuarios
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 * IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
 */
@RestController
@RequestMapping("/auth")
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

    /**
     * Maneja las solicitudes de cambio de contraseña
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody PasswordChangeDto passwordChangeDto,
            Authentication authentication) {
        
        try {
            // Obtener el nombre de usuario del usuario autenticado
            String username = authentication.getName();
            
            // Cambiar la contraseña
            boolean success = authService.changePassword(username, passwordChangeDto);
            
            if (success) {
                return ResponseEntity.ok().body("Contraseña actualizada exitosamente");
            } else {
                return ResponseEntity.badRequest().body("No se pudo actualizar la contraseña");
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Maneja las solicitudes para generar un token de restablecimiento de contraseña
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody PasswordResetRequestDto requestDto) {
        try {
            String token = authService.createPasswordResetToken(requestDto.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "Se ha enviado un correo electrónico con las instrucciones para restablecer su contraseña");
            
            // En un entorno de producción, no deberías devolver el token directamente
            // Aquí lo hacemos para simplificar el desarrollo y pruebas
            response.put("token", token);
            
            return ResponseEntity.ok().body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Maneja las solicitudes para validar un token de restablecimiento
     */
    @GetMapping("/reset-password/validate")
    public ResponseEntity<?> validatePasswordResetToken(@RequestParam String token) {
        boolean isValid = authService.validatePasswordResetToken(token);
        
        if (isValid) {
            return ResponseEntity.ok().body("Token válido");
        } else {
            return ResponseEntity.badRequest().body("Token no válido o expirado");
        }
    }
    
    /**
     * Maneja las solicitudes para restablecer la contraseña usando un token
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetDto passwordResetDto) {
        try {
            boolean success = authService.resetPassword(passwordResetDto);
            
            if (success) {
                return ResponseEntity.ok().body("Contraseña restablecida exitosamente");
            } else {
                return ResponseEntity.badRequest().body("No se pudo restablecer la contraseña");
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}