package com.improvementsolutions.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CreateUserDto {
    
    @NotBlank(message = "El nombre es requerido")
    private String name;
    
    @NotBlank(message = "El email es requerido")
    @Email(message = "El email debe tener un formato válido")
    private String email;
    
    private String phone;
    
    @NotBlank(message = "El nombre de usuario es requerido")
    private String username;
    
    @NotBlank(message = "La contraseña es requerida")
    private String password;
    
    private Long business_id;
    
    // Los usuarios obtienen permisos a través de roles, no directamente
    private List<Long> role_ids;
    
    // Mantener permission_ids para compatibilidad temporal si es necesario
    // Se puede remover una vez que el frontend se actualice
    private List<Long> permission_ids;
}
