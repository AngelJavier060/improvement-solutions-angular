package com.improvementsolutions.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class RefreshTokenRequestDto {
    
    @NotBlank(message = "El refresh token no puede estar vacío")
    private String refreshToken;
    
    public RefreshTokenRequestDto() {
    }
    
    public RefreshTokenRequestDto(String refreshToken) {
        this.refreshToken = refreshToken;
    }
    
    public String getRefreshToken() {
        return refreshToken;
    }
    
    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
