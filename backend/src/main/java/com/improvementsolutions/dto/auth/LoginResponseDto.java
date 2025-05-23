package com.improvementsolutions.dto.auth;

import lombok.Data;

import java.util.List;

/**
 * DTO para las respuestas de inicio de sesión
 */
@Data
public class LoginResponseDto {
    
    private String token;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserInfoDto userDetail;
    
    public LoginResponseDto() {
    }
    
    public LoginResponseDto(String token, UserInfoDto userDetail) {
        this.token = token;
        this.userDetail = userDetail;
        this.expiresIn = 3600L; // 1 hora por defecto
    }
    
    @Data
    public static class UserInfoDto {
        private Long id;
        private String name;
        private String username;
        private String email;
        private List<String> roles;
        
        public UserInfoDto() {
        }
        
        public UserInfoDto(Long id, String username, String email, List<String> roles) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.roles = roles;
        }
    }
}
