package com.improvementsolutions.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Servicio para generar URLs temporales para los archivos
 * Similar a la función CommonImage.getTemporaryUrl() en Laravel
 */
@Service
@RequiredArgsConstructor
public class FileUrlService {

    @Value("${app.jwt.secret:temporaryFilesSecretKey}")
    private String jwtSecret;
    
    @Value("${app.base-url:}")
    private String baseUrl;

    /**
     * Genera una URL temporal para un archivo
     * @param filePath Ruta del archivo
     * @param expirationMinutes Tiempo de expiración en minutos
     * @return URL temporal
     */
    public String generateTemporaryUrl(String filePath, int expirationMinutes) {
        if (filePath == null || filePath.isBlank()) {
            return null;
        }
        
        // Crear fecha de expiración
        Date now = new Date();
        Date expiration = new Date(now.getTime() + expirationMinutes * 60 * 1000);
        
        // Generar token JWT con la ruta del archivo
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .setSubject(filePath)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(now)
                .setExpiration(expiration)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
        
        // Construir URL base
        String baseUrlToUse = baseUrl;
        if (baseUrlToUse.isBlank()) {
            baseUrlToUse = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        }
        
        // Retornar URL con token como parámetro
        return baseUrlToUse + "/api/files/temp?token=" + token;
    }

    /**
     * Valida y extrae la ruta del archivo desde un token JWT
     * @param token Token JWT
     * @return Ruta del archivo o null si el token es inválido
     */
    public String getFilePathFromToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            return Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Obtiene la URL directa para un archivo
     * @param filename Nombre del archivo
     * @return URL del archivo
     */
    public String getUrl(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        
        String baseUrlToUse = baseUrl;
        if (baseUrlToUse.isBlank()) {
            baseUrlToUse = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        }
        
        return baseUrlToUse + "/api/files/" + filename;
    }
}
