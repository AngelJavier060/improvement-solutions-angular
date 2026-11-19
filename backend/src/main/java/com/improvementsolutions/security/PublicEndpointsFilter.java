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
 * Pasa las rutas públicas al resto de la cadena.
 * No responde OPTIONS: esa prueba la cierra {@code CorsFilter}, que va primero.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class PublicEndpointsFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(PublicEndpointsFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        return !(path.startsWith("/api/auth/") || path.startsWith("/api/v1/auth/")
                || path.startsWith("/api/public/") || path.startsWith("/api/v1/public/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.debug("PublicEndpointsFilter: {} {}", request.getMethod(), request.getServletPath());
        filterChain.doFilter(request, response);
    }
}
