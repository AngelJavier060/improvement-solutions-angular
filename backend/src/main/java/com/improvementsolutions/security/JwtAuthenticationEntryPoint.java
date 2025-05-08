package com.improvementsolutions.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Punto de entrada para manejar excepciones de autenticación
 * Se invoca cuando un usuario no autenticado intenta acceder a un recurso protegido
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        // Enviar respuesta de error 401 (No autorizado)
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "No autorizado: " + authException.getMessage());
    }
}