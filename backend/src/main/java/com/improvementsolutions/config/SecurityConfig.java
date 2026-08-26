package com.improvementsolutions.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.improvementsolutions.security.JwtAuthenticationEntryPoint;
import com.improvementsolutions.security.JwtAuthenticationFilter;
import com.improvementsolutions.security.SupervisorWriteCapabilityFilter;

/**
 * Configuración de seguridad principal de la aplicación.
 * Escritura operativa: ADMIN, SUPER_ADMIN o MANAGER siempre.
 * ROLE_USER (Supervisor): escritura solo si la matriz de capacidades lo habilita
 * (SupervisorWriteCapabilityFilter). Por defecto solo lectura.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true, prePostEnabled = true)
public class SecurityConfig {    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SupervisorWriteCapabilityFilter supervisorWriteCapabilityFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Rutas operativas de empresa: POST/PUT/PATCH/DELETE requieren ADMIN, SUPER_ADMIN o MANAGER.
     * GET permanece autenticado (y/@PreAuthorize con USER donde aplique).
     */
    private static final String[] COMPANY_WRITE_PATHS = {
            "/api/inventory/**",
            "/api/fleet/**",
            "/api/attendance/**",
            "/api/incidents/**",
            "/api/gerencias-viajes/**",
            "/api/obligation-matrices/**",
            "/api/approvals/**",
            "/api/employee/**",
            "/api/employees/**",
            "/api/business-employees/**",
            "/api/employee_document",
            "/api/employee_document/**",
            "/api/employee_course",
            "/api/employee_course/**",
            "/api/employee_card",
            "/api/employee_card/**",
            "/api/employee_contract",
            "/api/employee_contract/**",
            "/api/files/upload",
            "/api/files/upload/**",
            "/api/files/staging/**",
            "/api/files/delete/**"
    };

    public SecurityConfig(
            JwtAuthenticationEntryPoint unauthorizedHandler,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            SupervisorWriteCapabilityFilter supervisorWriteCapabilityFilter,
            CorsConfigurationSource corsConfigurationSource) {
        this.unauthorizedHandler = unauthorizedHandler;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.supervisorWriteCapabilityFilter = supervisorWriteCapabilityFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    /**
     * Configura la cadena de filtros de seguridad.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource)) // Usa explícitamente nuestra configuración CORS
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exceptionHandling -> 
                exceptionHandling.authenticationEntryPoint(unauthorizedHandler)
            )
            .sessionManagement(sessionManagement -> 
                sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Permitir todas las solicitudes preflight OPTIONS
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/attendance/*/consolidado-hhtt/debug").permitAll()
                .requestMatchers("/api/configuration/**").permitAll() // Permitir endpoints de configuración
                .requestMatchers("/error").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                // Escritura operativa: Admin, Superadmin o Gestor (MANAGER).
                // Supervisor (USER) también puede llegar aquí; SupervisorWriteCapabilityFilter exige matriz.
                .requestMatchers(HttpMethod.POST, COMPANY_WRITE_PATHS).hasAnyRole("ADMIN", "SUPER_ADMIN", "MANAGER", "USER")
                .requestMatchers(HttpMethod.PUT, COMPANY_WRITE_PATHS).hasAnyRole("ADMIN", "SUPER_ADMIN", "MANAGER", "USER")
                .requestMatchers(HttpMethod.PATCH, COMPANY_WRITE_PATHS).hasAnyRole("ADMIN", "SUPER_ADMIN", "MANAGER", "USER")
                .requestMatchers(HttpMethod.DELETE, COMPANY_WRITE_PATHS).hasAnyRole("ADMIN", "SUPER_ADMIN", "MANAGER", "USER")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(supervisorWriteCapabilityFilter, JwtAuthenticationFilter.class)
            .build();
    }
}
