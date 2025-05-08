package com.improvementsolutions.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO para las solicitudes de inicio de sesión
 */
@Data
public class LoginRequestDto {
    
    @NotBlank(message = "El nombre de usuario es obligatorio")
    private String username;
    
    @NotBlank(message = "La contraseña es obligatoria")
    private String password;
}