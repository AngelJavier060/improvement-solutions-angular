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
    private String refreshToken;
    private Long refreshExpiresIn;
    
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
        private List<BusinessInfoDto> businesses;
        /** Capacidades operativas efectivas (matriz por usuario / rol). */
        private UserOperationalCapabilityInfoDto operationalCapabilities;
        
        public UserInfoDto() {
        }
        
        public UserInfoDto(Long id, String username, String email, List<String> roles) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.roles = roles;
        }
    }

    @Data
    public static class UserOperationalCapabilityInfoDto {
        private boolean canView;
        private boolean canDownload;
        private boolean canCreate;
        private boolean canEdit;
        private boolean canDelete;
        private boolean canUpload;
        private boolean canOvertime;
        private boolean canVacations;
        private boolean canTimeOff;
        private boolean canWriteOps;
        private boolean writeLockedByRole;
    }
    
    @Data
    public static class BusinessInfoDto {
        private Long id;
        private String name;
        private String ruc;
        private String email;
        private String phone;
        
        public BusinessInfoDto() {
        }
        
        public BusinessInfoDto(Long id, String name, String ruc, String email, String phone) {
            this.id = id;
            this.name = name;
            this.ruc = ruc;
            this.email = email;
            this.phone = phone;
        }
    }
}
