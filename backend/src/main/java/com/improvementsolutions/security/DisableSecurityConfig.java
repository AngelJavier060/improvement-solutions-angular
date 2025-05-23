package com.improvementsolutions.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.security.enabled", havingValue = "false", matchIfMissing = true)
public class DisableSecurityConfig {
    // Esta clase vacía deshabilitará la configuración de seguridad cuando spring.security.enabled=false
}
