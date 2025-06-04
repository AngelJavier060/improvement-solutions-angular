package com.improvementsolutions.dto.user;

import java.time.LocalDateTime;
import java.util.Set;

import lombok.Data;

/**
 * DTO que representa la información de un usuario
 */
@Data
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String name;
    private String phone;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String profilePicture;
    private Set<String> roles;
    private String lastLogin;
}
