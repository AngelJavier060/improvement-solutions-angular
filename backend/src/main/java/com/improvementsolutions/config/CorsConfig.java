package com.improvementsolutions.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Configuración CORS simplificada y centralizada.
 * Esta configuración se aplica a toda la aplicación.
 */
@Configuration
public class CorsConfig {

    /**
     * Configura la fuente de configuración CORS para la aplicación.
     */
    @Bean
    @Primary
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.allowed.origins:}") String allowedOriginsProp) {
        CorsConfiguration configuration = new CorsConfiguration();

        // Construye la lista de orígenes permitidos a partir de propiedades + localhost
        List<String> allowedOrigins = Arrays.stream(allowedOriginsProp.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        // Siempre permitir el localhost de desarrollo (Angular + Flutter Web en puerto aleatorio)
        if (!allowedOrigins.contains("http://localhost:4200")) {
            allowedOrigins.add("http://localhost:4200");
        }
        if (!allowedOrigins.contains("http://localhost:*")) {
            allowedOrigins.add("http://localhost:*");
        }
        if (!allowedOrigins.contains("http://127.0.0.1:*")) {
            allowedOrigins.add("http://127.0.0.1:*");
        }
        configuration.setAllowedOriginPatterns(allowedOrigins);

        // Permitir todos los métodos HTTP necesarios
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        
        // Permitir todos los encabezados necesarios con lista específica para mejor compatibilidad
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With",
            "Accept", 
            "Origin", 
            "Access-Control-Request-Method", 
            "Access-Control-Request-Headers"
        ));
        
        // Exponer encabezados que el cliente puede acceder
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Disposition", 
            "Content-Length",
            "Cache-Control",
            "Content-Language",
            "Expires"
        ));
        
        // Permitir credenciales como cookies
        configuration.setAllowCredentials(true);
        
        // Tiempo de cache para respuestas pre-flight
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
    
    /**
     * Atiende la prueba OPTIONS de Chrome antes que cualquier otro filtro.
     * Si otro filtro responde primero, el navegador no recibe
     * Access-Control-Allow-Origin y el login ni siquiera sale de la app.
     */
    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsConfigurationSource corsConfigurationSource) {
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(new CorsFilter(corsConfigurationSource));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }
}
