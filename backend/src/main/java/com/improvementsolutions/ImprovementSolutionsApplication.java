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
    
    // Agregamos configuración CORS adicional para garantizar que funcione
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Configuración general CORS
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:4200")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600); // Aumentamos el tiempo de cache para las preflight requests
                
                // Configuración específica para endpoint de estado civil
                registry.addMapping("/api/v1/estado-civil/**")
                        .allowedOrigins("http://localhost:4200")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(false) // No requiere credenciales
                        .maxAge(3600);
            }
        };
    }
}