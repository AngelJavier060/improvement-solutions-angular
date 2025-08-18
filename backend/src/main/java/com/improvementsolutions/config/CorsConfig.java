package com.improvementsolutions.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

/**
 * Configuración CORS simplificada y centralizada.
 * Esta configuración se aplica a toda la aplicación.
 */
@Configuration
public class CorsConfig {

    /**
     * Configura la fuente de configuración CORS para la aplicación.
     */    @Bean
    @Primary
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Permitir el origen del frontend de manera explícita
        configuration.addAllowedOriginPattern("http://localhost:4200");
        
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
     * Crea un filtro CORS basado en la configuración.
     */
    @Bean
    @Primary
    public CorsFilter corsFilter(CorsConfigurationSource corsConfigurationSource) {
        return new CorsFilter(corsConfigurationSource);
    }
}
