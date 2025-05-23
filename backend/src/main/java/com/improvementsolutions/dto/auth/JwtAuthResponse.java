package com.improvementsolutions.dto.auth;

import com.improvementsolutions.dto.UserDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtAuthResponse {
    private String token;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private UserDTO userDetail;
}
