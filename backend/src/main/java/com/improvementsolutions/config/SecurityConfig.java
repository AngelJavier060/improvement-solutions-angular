package com.improvementsolutions.config;

import com.improvementsolutions.security.JwtAuthenticationEntryPoint;
import com.improvementsolutions.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsFilter corsFilter; // Agregar el filtro CORS

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Auth-Token"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Configurar CORS y deshabilitar CSRF
            .cors().and()
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Nuevo endpoint público para géneros (SIN autenticación)
                .requestMatchers("/api/v1/public/**").permitAll()
                
                // Mover las rutas públicas al principio para asegurar que se evalúen primero
                // Rutas de géneros completamente públicas
                .requestMatchers("/api/v1/generos/**").permitAll()
                .requestMatchers("/generos/**").permitAll()
                .requestMatchers("/api/generos/**").permitAll()
                
                // Permitir OPTIONS para CORS preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // Otras rutas públicas
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/api/v1/files/**", "/files/**").permitAll()
                .requestMatchers("/api/v1/test/**", "/test/**").permitAll()
                .requestMatchers("/api/v1/prueba/**", "/prueba/**").permitAll()
                
                // Otras rutas públicas (estudios, estado civil)
                .requestMatchers("/api/v1/estudios/**", "/estudios/**").permitAll()
                .requestMatchers("/api/v1/estado-civil/**", "/estado-civil/**").permitAll()
                
                // Rutas protegidas
                .requestMatchers("/api/v1/admin/**", "/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/businesses/public/**", "/businesses/public/**").permitAll()
                .requestMatchers("/api/v1/businesses/**", "/businesses/**").hasAnyRole("ADMIN", "USER")
                
                // Cualquier otra solicitud necesita autenticación
                .anyRequest().authenticated()
            );
        
        // Agregar nuestro filtro CORS antes del filtro JWT
        http.addFilterBefore(corsFilter, UsernamePasswordAuthenticationFilter.class);
        
        // Agregar nuestro filtro JWT personalizado antes del filtro UsernamePasswordAuthenticationFilter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}