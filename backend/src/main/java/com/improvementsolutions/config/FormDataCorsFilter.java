package com.improvementsolutions.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Filtro universal para manejar todas las solicitudes CORS
 * con una prioridad alta para asegurar que se ejecute antes de otros filtros.
 * Esto garantiza que las solicitudes preflight OPTIONS reciban las cabeceras correctas.
 * 
 * Versión mejorada para manejar correctamente la carga de archivos.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FormDataCorsFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(FormDataCorsFilter.class);
    
    @Override    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Detectar si la solicitud es para la ruta problemática de carga de archivos
        boolean isFileUpload = request.getRequestURI().contains("/api/files/upload");
        
        // Log detallado para diagnóstico
        if (isFileUpload) {
            logger.info("🔍 CORS Filter: Procesando {} solicitud para carga de archivos: {}", 
                request.getMethod(), request.getRequestURI());
            logger.info("Headers de solicitud: Origin={}, Content-Type={}", 
                request.getHeader("Origin"), 
                request.getHeader("Content-Type"));
        } else {
            logger.debug("CORS Filter: Procesando {} solicitud para: {}", 
                request.getMethod(), request.getRequestURI());
        }        // IMPORTANTE: Remover cualquier cabecera CORS previa para evitar duplicados
        response.setHeader("Access-Control-Allow-Origin", null);
        
        // Establecer cabeceras CORS para todas las solicitudes
        String origin = request.getHeader("Origin");
        if (origin != null && origin.contains("localhost")) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            if (isFileUpload) {
                logger.info("✅ CORS Filter: Estableciendo origen específico: {}", origin);
            }
        } else if (origin != null) {
            // Si hay otro origen que no es localhost, usamos ese para desarrollo
            response.setHeader("Access-Control-Allow-Origin", origin);
            if (isFileUpload) {
                logger.info("✅ CORS Filter: Estableciendo origen externo: {}", origin);
            }
        } else {
            response.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
            if (isFileUpload) {
                logger.info("✅ CORS Filter: Estableciendo origen por defecto: http://localhost:4200");
            }
        }
        
        // Configurar las demás cabeceras CORS
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
        response.setHeader("Access-Control-Allow-Headers", 
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Method, Access-Control-Request-Headers");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Max-Age", "3600");
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
        
        // Si es una solicitud OPTIONS (preflight), devolver OK inmediatamente
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            if (isFileUpload) {
                logger.info("✅ CORS Filter: Respondiendo a solicitud OPTIONS preflight para carga de archivos: {}", 
                    request.getRequestURI());
            }
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
          // Continuar con la cadena solo después de establecer correctamente las cabeceras CORS
        try {
            chain.doFilter(req, res);
        } finally {
            // Verificamos después de la cadena si hay problemas con cabeceras CORS
            if (isFileUpload) {
                String corsHeader = response.getHeader("Access-Control-Allow-Origin");
                if (corsHeader != null && corsHeader.contains(",")) {
                    logger.error("❌ CORS Filter: Detectado problema de múltiples cabeceras Origin después de la cadena: {}", corsHeader);
                    // Corregir el problema estableciendo una única cabecera correcta
                    if (origin != null) {
                        response.setHeader("Access-Control-Allow-Origin", origin);
                        logger.info("✅ CORS Filter: Corregida cabecera de origen múltiple a: {}", origin);
                    } else {
                        response.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
                        logger.info("✅ CORS Filter: Corregida cabecera de origen múltiple al valor por defecto");
                    }
                }
            }
        }
    }
}
