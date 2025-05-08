package com.improvementsolutions.dto.auth;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para las respuestas de inicio de sesión
 */
@Data
@NoArgsConstructor
public class LoginResponseDto {
    
    private String token;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserInfoDto userDetail;
    
    @Data
    @NoArgsConstructor
    public static class UserInfoDto {
        private Long id;
        private String name;
        private String username;
        private String email;
        private List<String> roles;
    }
}