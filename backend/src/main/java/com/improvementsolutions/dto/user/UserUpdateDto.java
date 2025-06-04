package com.improvementsolutions.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.Set;

import lombok.Data;

/**
 * DTO para actualizar un usuario
 */
@Data
public class UserUpdateDto {
    
    @Size(max = 50)
    private String username;
    
    @Email
    @Size(max = 100)
    private String email;
    
    @Size(max = 100)
    private String name;
    
    @Size(max = 20)
    private String phone;
    
    @Size(min = 6, max = 100, message = "La contraseña debe tener entre 6 y 100 caracteres")
    private String password;
    
    private Boolean active;
    
    private Set<Long> roleIds;
}
