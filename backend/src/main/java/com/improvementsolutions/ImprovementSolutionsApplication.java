package com.improvementsolutions;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class ImprovementSolutionsApplication {

    public static void main(String[] args) {
        SpringApplication.run(ImprovementSolutionsApplication.class, args);
    }
      /**
     * Configuración centralizada de CORS para toda la aplicación.
     * Esta es la única configuración de CORS que debemos usar.
     * Cualquier anotación @CrossOrigin en controladores debe ser eliminada.
     */    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Valores comunes para todas las configuraciones
                String[] allowedOrigins = {"http://localhost:4200", "https://improvementsolutions.com"}; // Permitir tanto desarrollo como producción
                String[] allowedMethods = {"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"};
                String[] allowedHeaders = {"*"};
                long maxAge = 3600; // Tiempo de cache para las preflight requests (1 hora)
                  // Configuración para endpoints sin credenciales (públicos)
                // IMPORTANTE: Como ya tenemos server.servlet.context-path=/api/v1, no debemos incluirlo en las rutas
                String[] publicEndpoints = {
                    "/public/**",        // Endpoints públicos (se convierten en /api/v1/public/**)
                    "/files/**",         // Endpoints de archivos (se convierten en /api/v1/files/**)
                    "/auth/login",       // Endpoint de login (se convierte en /api/v1/auth/login)
                    "/auth/register",    // Endpoint de registro (se convierte en /api/v1/auth/register)
                    "/auth/forgot-password" // Endpoint de recuperación (se convierte en /api/v1/auth/forgot-password)
                };
                
                // Aplicar configuración para endpoints públicos (sin credenciales)
                for (String endpoint : publicEndpoints) {
                    registry.addMapping(endpoint)
                            .allowedOrigins(allowedOrigins)
                            .allowedMethods(allowedMethods)
                            .allowedHeaders(allowedHeaders)
                            .allowCredentials(false) // Sin credenciales para endpoints públicos
                            .maxAge(maxAge);
                }
                
                // Configuración general CORS (con credenciales) para el resto de endpoints
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods(allowedMethods)
                        .allowedHeaders(allowedHeaders)
                        .allowCredentials(true)
                        .maxAge(maxAge);
            }
        };
    }
}