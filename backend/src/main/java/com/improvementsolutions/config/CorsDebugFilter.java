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

import java.io.IOException;

public class CorsDebugFilter implements Filter {
    
    private static final Logger logger = LoggerFactory.getLogger(CorsDebugFilter.class);
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        
        // Log CORS-related headers
        logger.info("Processing CORS for request: {}", req.getRequestURI());
        logger.info("Origin: {}", req.getHeader("Origin"));
        logger.info("Access-Control-Request-Method: {}", req.getHeader("Access-Control-Request-Method"));
        logger.info("Access-Control-Request-Headers: {}", req.getHeader("Access-Control-Request-Headers"));
        
        // Continue with the filter chain
        chain.doFilter(request, response);
        
        // Log CORS-related response headers
        logger.info("CORS Response Headers for: {}", req.getRequestURI());
        logger.info("Access-Control-Allow-Origin: {}", res.getHeader("Access-Control-Allow-Origin"));
        logger.info("Access-Control-Allow-Methods: {}", res.getHeader("Access-Control-Allow-Methods"));
        logger.info("Access-Control-Allow-Headers: {}", res.getHeader("Access-Control-Allow-Headers"));
        logger.info("Access-Control-Allow-Credentials: {}", res.getHeader("Access-Control-Allow-Credentials"));
        logger.info("Access-Control-Max-Age: {}", res.getHeader("Access-Control-Max-Age"));
    }
}
