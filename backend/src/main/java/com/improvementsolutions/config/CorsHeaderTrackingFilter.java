package com.improvementsolutions.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;

import java.io.IOException;

/**
 * Filtro de diagnóstico para seguimiento de cabeceras CORS.
 * Este filtro envuelve la respuesta para detectar cuándo y dónde se modifican las cabeceras CORS.
 */
// @Component  // Desactivado temporalmente para evitar conflictos entre filtros
@Order(Ordered.HIGHEST_PRECEDENCE + 1) // Justo después del FormDataCorsFilter
public class CorsHeaderTrackingFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(CorsHeaderTrackingFilter.class);

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Solo hacer seguimiento detallado para rutas críticas
        boolean isTargetRoute = request.getRequestURI().contains("/api/files/upload/logos");
        
        if (isTargetRoute) {
            logger.info("🔍 CorsHeaderTrackingFilter: Iniciando seguimiento para {}", request.getRequestURI());
            
            // Envolver la respuesta para detectar cambios en las cabeceras CORS
            CorsHeaderTrackingResponseWrapper wrappedResponse = new CorsHeaderTrackingResponseWrapper(response);
            
            // Continuar con la cadena de filtros usando la respuesta envuelta
            chain.doFilter(request, wrappedResponse);
            
            // Verificar si se han establecido múltiples valores para Access-Control-Allow-Origin
            String corsOrigin = response.getHeader("Access-Control-Allow-Origin");
            if (corsOrigin != null && corsOrigin.contains(",")) {
                logger.error("❌ ORIGEN DEL PROBLEMA DETECTADO: Cabecera Access-Control-Allow-Origin con múltiples valores: {}", corsOrigin);
            } else {
                logger.info("✅ Cabecera CORS correcta: Access-Control-Allow-Origin = {}", corsOrigin);
            }
        } else {
            // Para otras rutas, simplemente continuar
            chain.doFilter(req, res);
        }
    }

    /**
     * Clase interna que envuelve HttpServletResponse para rastrear modificaciones de cabeceras CORS
     */
    private class CorsHeaderTrackingResponseWrapper extends HttpServletResponseWrapper {
        public CorsHeaderTrackingResponseWrapper(HttpServletResponse response) {
            super(response);
        }

        @Override
        public void setHeader(String name, String value) {
            if ("Access-Control-Allow-Origin".equalsIgnoreCase(name)) {
                String existingValue = getHeader(name);
                logger.info("🔧 Cabecera CORS modificada: {} = {} (valor anterior: {})", 
                        name, value, existingValue);
                
                // Identificar la clase/método que está modificando la cabecera
                StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
                if (stackTrace.length > 3) {
                    logger.info("🔧 Modificada por: {} en {}", 
                            stackTrace[3].getClassName(), 
                            stackTrace[3].getMethodName());
                }
            }
            super.setHeader(name, value);
        }

        @Override
        public void addHeader(String name, String value) {
            if ("Access-Control-Allow-Origin".equalsIgnoreCase(name)) {
                String existingValue = getHeader(name);
                logger.info("➕ Cabecera CORS añadida: {} = {} (valor anterior: {})", 
                        name, value, existingValue);
                
                // Identificar la clase/método que está añadiendo la cabecera
                StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
                if (stackTrace.length > 3) {
                    logger.info("➕ Añadida por: {} en {}", 
                            stackTrace[3].getClassName(), 
                            stackTrace[3].getMethodName());
                }
                
                // Advertencia específica si ya existe un valor
                if (existingValue != null) {
                    logger.warn("⚠️ PROBLEMA POTENCIAL: Añadiendo valor '{}' a la cabecera CORS que ya tiene el valor '{}'", 
                            value, existingValue);
                }
            }
            super.addHeader(name, value);
        }
    }
}
