package com.improvementsolutions.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        // Log de la petición entrante
        logger.info("=== INICIO DE PETICIÓN ===");
        logger.info("Método: {}", req.getMethod());
        logger.info("URI: {}", req.getRequestURI());
        logger.info("Query String: {}", req.getQueryString());
        logger.info("Content Type: {}", req.getContentType());
        logger.info("Content Length: {}", req.getContentLength());

        // Log de los headers de la petición
        logger.info("=== HEADERS DE LA PETICIÓN ===");
        java.util.Enumeration<String> headerNames = req.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            logger.info("{}: {}", headerName, req.getHeader(headerName));
        }

        long startTime = System.currentTimeMillis();
        
        try {
            // Continuar con la cadena de filtros
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            
            // Log de la respuesta
            logger.info("=== RESPUESTA ===");
            logger.info("Status: {}", res.getStatus());
            logger.info("Content Type: {}", res.getContentType());
            
            // Log de los headers de la respuesta
            logger.info("=== HEADERS DE LA RESPUESTA ===");
            res.getHeaderNames().forEach(headerName -> 
                logger.info("{}: {}", headerName, res.getHeader(headerName))
            );
            
            logger.info("Response: {} {} completed in {}ms", req.getMethod(), 
                        req.getRequestURI(), duration);
            
            logger.info("=== FIN DE PETICIÓN ===\n");
        }
    }
}
