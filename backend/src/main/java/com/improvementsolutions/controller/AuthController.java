package com.improvementsolutions.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.improvementsolutions.dto.ErrorResponse;
import com.improvementsolutions.dto.SuccessResponse;
import com.improvementsolutions.dto.auth.*;
import com.improvementsolutions.exception.UserInactiveException;
import com.improvementsolutions.exception.UserNotFoundException;
import com.improvementsolutions.service.AuthService;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.security.UserDetailsImpl;
import com.improvementsolutions.repository.UserRepository;

/**
 * Controlador para la autenticación de usuarios
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private UserRepository userRepository;

    /**
     * Endpoint de emergencia para resetear el Super Usuario.
     * REMOVER EN PRODUCCIÓN DESPUÉS DE USAR.
     */
    @GetMapping("/emergency-reset")
    public ResponseEntity<?> emergencyReset() {
        try {
            String result = authService.executeEmergencyReset();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error en emergency reset: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error en reset: " + e.getMessage());
        }
    }

    /**
     * Endpoint de diagnóstico - listar usuarios
     */
    @GetMapping("/users")
    public ResponseEntity<?> listUsers() {
        try {
            List<User> users = userRepository.findAll();
            List<Map<String, Object>> usersInfo = users.stream()
                .map(user -> {
                    Map<String, Object> info = new HashMap<>();
                    info.put("id", user.getId());
                    info.put("username", user.getUsername());
                    info.put("email", user.getEmail());
                    info.put("active", user.getActive());
                    info.put("roles", user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toList()));
                    return info;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(usersInfo);
        } catch (Exception e) {
            logger.error("Error al listar usuarios: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al listar usuarios: " + e.getMessage()));
        }

    }

    /**
     * Refresca el access token usando un refresh token válido
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshTokenRequestDto body) {
        try {
            if (body == null || body.getRefreshToken() == null || body.getRefreshToken().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse("Refresh token requerido"));
            }
            return ResponseEntity.ok(authService.refreshAccessToken(body.getRefreshToken()));
        } catch (BadCredentialsException e) {
            logger.error("Refresh token inválido: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Refresh token inválido o expirado", "UNAUTHORIZED", 401));
        } catch (Exception e) {
            logger.error("Error al refrescar token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse("Error al refrescar token", "INTERNAL_SERVER_ERROR", 500));
        }
    }

    /**
     * Valida un token de restablecimiento de contraseña sin consumirlo
     */
    @PostMapping("/validate-reset-token")
    public ResponseEntity<Boolean> validateResetToken(@RequestBody Map<String, String> body) {
        try {
            String token = body != null ? body.get("token") : null;
            boolean valid = token != null && authService.isResetTokenValid(token);
            return ResponseEntity.ok(valid);
        } catch (Exception e) {
            logger.error("Error al validar token de reset: {}", e.getMessage());
            return ResponseEntity.ok(false);
        }
    }

    /**
     * Maneja las solicitudes de inicio de sesión
     */    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequestDto loginRequest,
            @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
            HttpServletRequest request) {
        try {
            String ipAddress = extractIpAddress(request);
            String deviceInfo = String.format("%s - %s", userAgent, ipAddress);
            
            LoginResponseDto response = authService.authenticateUser(loginRequest, deviceInfo, ipAddress);
            logger.info("Login exitoso para usuario: {}", response.getUserDetail().getUsername());
            return ResponseEntity.ok(response);
            
        } catch (UserNotFoundException e) {
            logger.error("Usuario no encontrado: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(
                    "Usuario no encontrado. Verifica que el nombre de usuario o email sea correcto",
                    "NOT_FOUND",
                    404));
                    
        } catch (BadCredentialsException e) {
            logger.error("Credenciales inválidas: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(
                    "Usuario o contraseña incorrectos",
                    "UNAUTHORIZED",
                    401));
                    
        } catch (UserInactiveException e) {
            logger.error("Usuario inactivo: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(
                    "Usuario inactivo. Por favor, contacta al administrador",
                    "FORBIDDEN",
                    403));
                    
        } catch (Exception e) {
            logger.error("Error en login: {}", e.getMessage(), e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(
                    "Error al procesar el inicio de sesión",
                    "INTERNAL_SERVER_ERROR",
                    500));
        }
    }
    
    private String extractIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Maneja las solicitudes de registro de usuario
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequestDto registerRequest) {
        try {
            return ResponseEntity.ok(authService.handleRegistration(registerRequest));
        } catch (Exception e) {
            logger.error("Error en registro: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error en registro: " + e.getMessage()));
        }
    }

    /**
     * Maneja las solicitudes para generar un token de restablecimiento de contraseña
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> requestPasswordReset(@Valid @RequestBody PasswordResetRequestDto requestDto) {
        try {
            String resetLink = authService.handlePasswordResetRequest(requestDto.getEmail());
            // Devolvemos mensaje estándar y adjuntamos el enlace en data para entornos de desarrollo
            return ResponseEntity.ok().body(new SuccessResponse("Se ha enviado un email con las instrucciones", resetLink));
        } catch (UserNotFoundException e) {
            logger.error("Usuario no encontrado para reset de contraseña: {}", e.getMessage());
            // Por seguridad, no indicamos si el email existe o no
            return ResponseEntity.ok().body(new SuccessResponse("Si el email existe, recibirá las instrucciones"));
        } catch (Exception e) {
            logger.error("Error al solicitar reset de contraseña: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al procesar la solicitud"));
        }
    }

    /**
     * Maneja las solicitudes para restablecer la contraseña usando un token
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetDto resetDto) {
        try {
            if (authService.handlePasswordReset(resetDto)) {
                return ResponseEntity.ok().body(new SuccessResponse("Contraseña actualizada exitosamente"));
            } else {
                return ResponseEntity.badRequest().body(new ErrorResponse("No se pudo restablecer la contraseña"));
            }
        } catch (Exception e) {
            logger.error("Error al restablecer contraseña: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al restablecer contraseña"));
        }
    }

    /**
     * Maneja las solicitudes de cambio de contraseña
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody PasswordChangeDto changeDto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authService.handlePasswordChange(authentication.getName(), changeDto)) {
                return ResponseEntity.ok().body(new SuccessResponse("Contraseña cambiada exitosamente"));
            } else {
                return ResponseEntity.badRequest().body(new ErrorResponse("No se pudo cambiar la contraseña"));
            }
        } catch (Exception e) {
            logger.error("Error al cambiar contraseña: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al cambiar contraseña"));
        }
    }

    /**
     * Maneja las solicitudes de cierre de sesión
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                authService.deactivateSession(token);
            }
            return ResponseEntity.ok().body(new SuccessResponse("Sesión cerrada exitosamente"));
        } catch (Exception e) {
            logger.error("Error al cerrar sesión: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al cerrar sesión"));
        }
    }

    /**
     * Endpoint para listar las sesiones activas del usuario
     */
    @GetMapping("/sessions")
    public ResponseEntity<?> listSessions(Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<UserSession> sessions = authService.getActiveSessions(userDetails.getId());
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            logger.error("Error al listar sesiones: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al listar sesiones"));
        }
    }

    /**
     * Endpoint para cerrar una sesión específica
     */
    @PostMapping("/sessions/{sessionId}/revoke")
    public ResponseEntity<?> revokeSession(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            authService.revokeSession(userDetails.getId(), sessionId);
            return ResponseEntity.ok().body(new SuccessResponse("Sesión revocada exitosamente"));
        } catch (Exception e) {
            logger.error("Error al revocar sesión: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al revocar sesión"));
        }
    }

    /**
     * Endpoint para cerrar todas las otras sesiones
     */
    @PostMapping("/sessions/revoke-others")
    public ResponseEntity<?> revokeOtherSessions(
            @RequestHeader("Authorization") String token,
            Authentication authentication) {
        try {
            String currentToken = token.substring(7); // Remover "Bearer "
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            authService.revokeOtherSessions(userDetails.getId(), currentToken);
            return ResponseEntity.ok().body(new SuccessResponse("Otras sesiones revocadas exitosamente"));
        } catch (Exception e) {
            logger.error("Error al revocar otras sesiones: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse("Error al revocar otras sesiones"));
        }
    }
}
