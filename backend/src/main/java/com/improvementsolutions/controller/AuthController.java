package com.improvementsolutions.controller;

import com.improvementsolutions.dto.auth.JwtAuthResponse;
import com.improvementsolutions.dto.auth.LoginRequest;
import com.improvementsolutions.dto.auth.RefreshTokenRequest;
import com.improvementsolutions.dto.auth.RegisterRequest;
import com.improvementsolutions.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<JwtAuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<JwtAuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/register/{business_ruc}")
    public ResponseEntity<?> registerByBusiness(
            @PathVariable String business_ruc,
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerByBusiness(request, business_ruc));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<JwtAuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request.getRefreshToken()));
    }
}