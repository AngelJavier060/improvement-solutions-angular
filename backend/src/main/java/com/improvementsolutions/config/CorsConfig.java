package com.improvementsolutions.config;

// import org.springframework.context.annotation.Configuration; - Ya no se necesita

/**
 * Configuración CORS (desactivada).
 * 
 * NOTA: La configuración CORS está centralizada en ImprovementSolutionsApplication.java
 * para evitar configuraciones duplicadas y conflictos. Esta clase se mantiene para referencia histórica
 * pero no está activa en la aplicación.
 */
// @Configuration - Comentado para evitar que Spring Boot procese esta clase
public class CorsConfig {
    // La configuración CORS ha sido movida a ImprovementSolutionsApplication.corsConfigurer()
    
    /*
    // Configuración anterior (desactivada)
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        
        // Configuración general
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        config.addAllowedMethod("*");
        config.addAllowedOrigin("http://localhost:4200");
        
        // Aplicar esta configuración a todas las rutas
        source.registerCorsConfiguration("/**", config);
        
        // Configuración especial para rutas públicas
        CorsConfiguration publicConfig = new CorsConfiguration();
        publicConfig.addAllowedHeader("*");
        publicConfig.setAllowCredentials(false); // No requiere credenciales para rutas públicas
        publicConfig.addAllowedMethod("*");
        publicConfig.addAllowedOrigin("*"); // Permitir desde cualquier origen
        publicConfig.addExposedHeader("Authorization");
        publicConfig.addExposedHeader("Content-Disposition");
        
        source.registerCorsConfiguration("/api/v1/public/**", publicConfig);
        
        return new CorsFilter(source);
    }
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins("http://localhost:4200")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
    */
}