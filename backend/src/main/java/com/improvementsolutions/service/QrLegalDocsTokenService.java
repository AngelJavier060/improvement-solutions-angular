package com.improvementsolutions.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class QrLegalDocsTokenService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${app.qr.legal-docs.expiration-ms:2592000000}") // 30 days
    private long expirationMs;

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String ruc) {
        return generateToken(ruc, null);
    }

    public String generateToken(String ruc, Integer version) {
        Date now = new Date();
        var builder = Jwts.builder()
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(now)
                .claim("scope", "QR_LEGAL_DOCS")
                .claim("ruc", ruc)
                .claim("v", version == null ? 0 : version.intValue())
                .signWith(signingKey(), SignatureAlgorithm.HS512);
        if (expirationMs > 0) {
            builder.setExpiration(new Date(now.getTime() + expirationMs));
        }
        return builder.compact();
    }

    public Claims validateAndParse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public void validateScopeAndRuc(String token, String ruc) {
        Claims claims = validateAndParse(token);
        String scope = claims.get("scope", String.class);
        String tokenRuc = claims.get("ruc", String.class);

        if (!"QR_LEGAL_DOCS".equals(scope)) {
            throw new RuntimeException("Token inválido (scope)");
        }
        if (tokenRuc == null || !tokenRuc.equals(ruc)) {
            throw new RuntimeException("Token inválido (empresa)");
        }
    }

    public Integer getTokenVersion(String token) {
        try {
            Claims claims = validateAndParse(token);
            Integer v = claims.get("v", Integer.class);
            return v == null ? 0 : v;
        } catch (Exception e) {
            return 0;
        }
    }
}
