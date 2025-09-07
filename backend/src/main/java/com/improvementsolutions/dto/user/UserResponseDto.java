package com.improvementsolutions.dto.user;

import lombok.Data;

import java.util.List;

@Data
public class UserResponseDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String username;
    private Long business_id;
    private List<String> permissions;
    private List<String> roles; // Simplificado para evitar recursión
    private String created_at;
    private String updated_at;
}
