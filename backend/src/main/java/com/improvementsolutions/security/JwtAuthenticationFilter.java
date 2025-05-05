package com.improvementsolutions.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    
    // Lista de rutas públicas que no necesitan autenticación
    private final List<String> publicPaths = Arrays.asList(
        "/api/v1/public/**", // Agregado para permitir todos los endpoints públicos nuevos
        "/api/v1/auth/**",
        "/auth/**",
        "/api/v1/files/**",
        "/files/**",
        "/api/v1/test/**",
        "/test/**",
        "/api/v1/prueba/**",
        "/prueba/**",
        "/api/v1/generos/**",
        "/generos/**",
        "/api/generos/**", // Añadido para la nueva ruta del controlador
        "/api/v1/estudios/**",
        "/estudios/**",
        "/api/estudios/**", // Añadido para la nueva ruta del controlador
        "/api/v1/estado-civil/**",
        "/estado-civil/**",
        "/api/estado-civil/**", // Añadido para la nueva ruta del controlador
        "/api/v1/businesses/public/**",
        "/businesses/public/**"
    );
    
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Verificar si la ruta actual es pública
        String requestPath = request.getRequestURI();
        
        // Si es una ruta pública, no procesar la autenticación JWT
        if (isPublicPath(requestPath)) {
            System.out.println("Ruta pública detectada: " + requestPath + " - Omitiendo autenticación JWT");
            filterChain.doFilter(request, response);
            return;
        }
            
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromJWT(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("No se pudo establecer la autenticación del usuario en el contexto de seguridad", ex);
        }

        filterChain.doFilter(request, response);
    }
    
    // Método para verificar si una ruta es pública
    private boolean isPublicPath(String requestPath) {
        for (String publicPath : publicPaths) {
            // Usar AntPathMatcher para soportar patrones con comodines
            if (pathMatcher.match(publicPath, requestPath)) {
                return true;
            }
        }
        return false;
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}