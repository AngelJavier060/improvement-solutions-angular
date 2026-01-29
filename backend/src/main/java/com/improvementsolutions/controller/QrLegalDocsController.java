package com.improvementsolutions.controller;

import com.improvementsolutions.service.QrLegalDocsTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/qr/legal-docs")
@RequiredArgsConstructor
public class QrLegalDocsController {

    private final QrLegalDocsTokenService tokenService;

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> issueToken(
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String ruc = body != null ? String.valueOf(body.getOrDefault("ruc", "")).trim() : "";
        if (ruc.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String token = tokenService.generateToken(ruc);
        Map<String, Object> res = new HashMap<>();
        res.put("token", token);
        return ResponseEntity.ok(res);
    }
}
