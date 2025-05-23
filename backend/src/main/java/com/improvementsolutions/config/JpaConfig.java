package com.improvementsolutions.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@Configuration
@EnableTransactionManagement
@EntityScan(basePackages = {"com.improvementsolutions.model"})
@EnableJpaRepositories(basePackages = {"com.improvementsolutions.repository"})
public class JpaConfig {
    // La configuración se maneja a través de las anotaciones y application.properties
}
