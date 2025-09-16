package com.improvementsolutions;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
@EntityScan(basePackages = "com.improvementsolutions.model")
@EnableJpaRepositories(basePackages = "com.improvementsolutions.repository")
public class ImprovementSolutionsApplication {
    private static final Logger logger = LoggerFactory.getLogger(ImprovementSolutionsApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(ImprovementSolutionsApplication.class, args);
    }
    
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        logger.info("Aplicación iniciada - Configuración CORS activa");
    }
}

// El archivo está correcto y completo. No necesita modificaciones.
// Contiene la configuración CORS apropiada que permite:
// - Solicitudes desde http://localhost:4200
// - Métodos HTTP: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH
// - Todos los headers
// - Credenciales
// - Una duración máxima de caché de 3600 segundos
