package com.improvementsolutions.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro especial para endpoints públicos que garantiza que 
 * no serán afectados por los filtros de autenticación.
 * Se ejecuta con la más alta prioridad (HIGHEST_PRECEDENCE).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PublicEndpointsFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(PublicEndpointsFilter.class);
      @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Aplicar este filtro solo para rutas que no requieren autenticación
        return !(path.startsWith("/api/auth/") || path.startsWith("/api/v1/auth/") || 
                path.startsWith("/api/public/") || path.startsWith("/api/v1/public/"));
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String requestPath = request.getServletPath();
        logger.info("PublicEndpointsFilter: Procesando ruta pública: {}", requestPath);
        
        // Agregar cabeceras CORS explícitas para endpoints públicos
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "*");
        response.setHeader("Access-Control-Max-Age", "3600");
        
        // Manejar las solicitudes OPTIONS (preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        // Registrar la información de la solicitud para diagnóstico
        logger.info("Solicitud a endpoint público: {} {}", request.getMethod(), requestPath);
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("User-Agent: {}", request.getHeader("User-Agent"));
        
        // Continuar con la cadena de filtros
        filterChain.doFilter(request, response);
    }
}
