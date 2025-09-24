package com.improvementsolutions.dto.user;

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
    
    @Size(max = 100)
    private String email;
    
    @Size(max = 100)
    private String name;
    
    @Size(max = 20)
    private String phone;
    
    private String password;
    
    private Boolean active;
    
    private Set<Long> roleIds;
}
