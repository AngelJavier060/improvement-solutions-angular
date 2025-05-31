package com.improvementsolutions.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Este filtro se ejecuta DESPUÉS de que se complete la cadena de filtros
 * para asegurarse de que las cabeceras CORS se aplican a TODAS las respuestas,
 * incluidas las respuestas de error y excepciones.
 */
// @Component  // Desactivado para evitar duplicación de configuración CORS
@Order(Ordered.LOWEST_PRECEDENCE)
public class CorsResponseFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(CorsResponseFilter.class);

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Primero ejecuta la cadena de filtros para que el resto del procesamiento ocurra
        chain.doFilter(req, res);
        
        // Después de que se complete la cadena, asegúrate de que las cabeceras CORS estén presentes
        if (response.getHeader("Access-Control-Allow-Origin") == null) {
            logger.info("CorsResponseFilter: Añadiendo cabeceras CORS faltantes para {}", request.getRequestURI());
            
            // Aplicar cabeceras CORS solo si no están ya presentes
            response.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
            response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
            
            logger.info("CorsResponseFilter: Cabeceras CORS añadidas a la respuesta");
        } else {
            logger.debug("CorsResponseFilter: Las cabeceras CORS ya están presentes");
        }
    }
}
