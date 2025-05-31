package com.improvementsolutions.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import java.util.Collection;

/**
 * Filtro de diagnóstico para CORS que registra todas las cabeceras CORS
 * en cada punto del procesamiento de la solicitud.
 * Este filtro debería ejecutarse con una prioridad media, entre FormDataCorsFilter y CorsResponseFilter.
 */
// @Component  // Desactivado temporalmente para evitar conflictos entre filtros
@Order(Ordered.HIGHEST_PRECEDENCE + 100) // Después de FormDataCorsFilter pero antes de otros filtros
public class CorsDiagnosticFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(CorsDiagnosticFilter.class);
    
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Solo aplicar diagnóstico en rutas específicas que tienen problemas con CORS
        if (request.getRequestURI().contains("/api/files/upload")) {
            logCorsHeaders("ANTES", request, response);
            
            // Envolver la respuesta para capturar cabeceras añadidas durante la cadena
            CorsHeaderResponseWrapper responseWrapper = new CorsHeaderResponseWrapper(response);
            
            chain.doFilter(request, responseWrapper);
            
            // Log después del procesamiento
            logCorsHeaders("DESPUÉS", request, response);
        } else {
            // Para otras rutas, simplemente continuar
            chain.doFilter(req, res);
        }
    }
    
    private void logCorsHeaders(String fase, HttpServletRequest request, HttpServletResponse response) {
        logger.info("===== CORS DIAGNÓSTICO [{}] =====", fase);
        logger.info("URI: {}", request.getRequestURI());
        logger.info("Método: {}", request.getMethod());
        
        // Cabeceras de la solicitud
        logger.info("--- Cabeceras de solicitud ---");
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Access-Control-Request-Method: {}", request.getHeader("Access-Control-Request-Method"));
        logger.info("Access-Control-Request-Headers: {}", request.getHeader("Access-Control-Request-Headers"));
        
        // Cabeceras de la respuesta
        logger.info("--- Cabeceras de respuesta ---");
        logger.info("Access-Control-Allow-Origin: {}", response.getHeader("Access-Control-Allow-Origin"));
        logger.info("Access-Control-Allow-Methods: {}", response.getHeader("Access-Control-Allow-Methods"));
        logger.info("Access-Control-Allow-Headers: {}", response.getHeader("Access-Control-Allow-Headers"));
        logger.info("Access-Control-Allow-Credentials: {}", response.getHeader("Access-Control-Allow-Credentials"));
        logger.info("Access-Control-Max-Age: {}", response.getHeader("Access-Control-Max-Age"));
        logger.info("Access-Control-Expose-Headers: {}", response.getHeader("Access-Control-Expose-Headers"));
        
        // Si hay múltiples valores para una cabecera, puede indicar un problema
        Collection<String> originsHeader = response.getHeaders("Access-Control-Allow-Origin");
        if (originsHeader != null && originsHeader.size() > 1) {
            logger.warn("⚠️ ¡PROBLEMA DETECTADO! Múltiples valores para Access-Control-Allow-Origin: {}", originsHeader);
        }
        
        logger.info("================================");
    }
    
    /**
     * Wrapper para la respuesta que permite rastrear las cabeceras añadidas
     */
    private static class CorsHeaderResponseWrapper extends HttpServletResponseWrapper {
        private final Logger logger = LoggerFactory.getLogger(CorsHeaderResponseWrapper.class);
        
        public CorsHeaderResponseWrapper(HttpServletResponse response) {
            super(response);
        }
        
        @Override
        public void setHeader(String name, String value) {
            if (name != null && name.startsWith("Access-Control-")) {
                logger.info("Cabecera CORS añadida: {} = {}", name, value);
            }
            super.setHeader(name, value);
        }
        
        @Override
        public void addHeader(String name, String value) {
            if (name != null && name.startsWith("Access-Control-")) {
                logger.info("Cabecera CORS añadida (adicional): {} = {}", name, value);
                
                // Detectar posibles adiciones múltiples
                String existingValue = getHeader(name);
                if (existingValue != null && !existingValue.equals(value)) {
                    logger.warn("⚠️ Añadiendo valor adicional a la cabecera existente: {} = {} (existente: {})", 
                            name, value, existingValue);
                }
            }
            super.addHeader(name, value);
        }
    }
}
