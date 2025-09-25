package com.improvementsolutions.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.improvementsolutions.security.JwtAuthenticationFilter;
import com.improvementsolutions.security.JwtAuthenticationEntryPoint;

@Configuration
public class PublicResourceConfig implements WebMvcConfigurer {
    private static final Logger logger = LoggerFactory.getLogger(PublicResourceConfig.class);
    
    @Value("${app.storage.location:uploads}")
    private String uploadDirectory;

    /**
     * Configuramos acceso a los directorios físicos de archivos
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Configurar mapeo para archivos en directorio de uploads
        Path uploadDir = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        String uploadPath = uploadDir.toString().replace("\\", "/");
        
        logger.info("⭐ Configurando acceso directo a recursos físicos de archivos");
        logger.info("Directorio de uploads: {}", uploadPath);
        
        // Configurar acceso al directorio de logos
        registry.addResourceHandler("/api/files/logos/**")
                // Buscar primero en la carpeta de logos y luego en la raíz como fallback
                .addResourceLocations(
                    "file:" + uploadPath + "/logos/",
                    "file:" + uploadPath + "/"
                )
                .setCachePeriod(3600);
        
        logger.info("Handler para directorio de logos configurado: file:{}/logos/", uploadPath);
        
        // Configurar acceso al directorio de uploads general
        registry.addResourceHandler("/api/files/**")
                .addResourceLocations("file:" + uploadPath + "/")
                .setCachePeriod(3600);
                
        logger.info("Handler para directorio de archivos general configurado: file:{}/", uploadPath);
    }

    /**
     * Configuración de seguridad específica para recursos públicos como los logos,
     * que deben ser accesibles sin autenticación.
     * Esta configuración tiene una prioridad más alta (Order=75) que la configuración general
     * para asegurar que se aplique primero a las rutas especificadas.
     */    @Bean
    @Order(75) // Mayor prioridad que la configuración general
    public SecurityFilterChain publicResourcesFilterChain(
            HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint unauthorizedHandler) throws Exception {
        logger.info("⭐ Configurando acceso público para recursos de archivos");
        
        return http
            .securityMatcher("/api/files/**") // Esta configuración aplica a todas las rutas de archivos
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource)) // Usa la configuración CORS centralizada
            .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Permitir todas las solicitudes OPTIONS
                .requestMatchers(HttpMethod.GET, "/api/files/logos/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/files/profiles/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/files/upload/logos").permitAll() // Corregido: sin /** al final
                // Staging requiere autenticación; los roles se validan con @PreAuthorize a nivel de método
                .requestMatchers(HttpMethod.POST, "/api/files/staging/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/debug/**").permitAll()
                .anyRequest().authenticated()
            )
            // MUY IMPORTANTE: aplicar nuestro filtro JWT también en esta cadena
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
