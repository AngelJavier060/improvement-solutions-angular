package com.improvementsolutions.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para las solicitudes de inicio de sesión
 * Permite autenticación por username o email
 */
public class LoginRequestDto {
    
    private String username;
    
    @NotBlank(message = "La contraseña no puede estar vacía")
    private String password;
    
    private String email;
      @jakarta.validation.constraints.AssertTrue(message = "Debe proporcionar un nombre de usuario o email")
    public boolean isValidIdentifier() {
        return (username != null && !username.trim().isEmpty()) || 
               (email != null && !email.trim().isEmpty());
    }
    
    /**
     * Verifica si tiene un identificador válido (username o email)
     */
    public boolean hasValidIdentifier() {
        return (username != null && !username.trim().isEmpty()) || 
               (email != null && !email.trim().isEmpty());
    }

    // Getters and Setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
