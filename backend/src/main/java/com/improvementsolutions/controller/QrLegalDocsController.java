package com.improvementsolutions.controller;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.repository.BusinessRepository;
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
    private final BusinessRepository businessRepository;

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

        Business business = businessRepository.findByRuc(ruc).orElse(null);
        int version = business != null && business.getQrLegalDocsTokenVersion() != null
                ? business.getQrLegalDocsTokenVersion()
                : 0;
        String token = tokenService.generateToken(ruc, version);
        Map<String, Object> res = new HashMap<>();
        res.put("token", token);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/rotate")
    public ResponseEntity<Map<String, Object>> rotate(
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

        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        int current = business.getQrLegalDocsTokenVersion() != null ? business.getQrLegalDocsTokenVersion() : 0;
        int next = current + 1;
        business.setQrLegalDocsTokenVersion(next);
        businessRepository.save(business);

        String token = tokenService.generateToken(ruc, next);
        Map<String, Object> res = new HashMap<>();
        res.put("version", next);
        res.put("token", token);
        return ResponseEntity.ok(res);
    }
}
