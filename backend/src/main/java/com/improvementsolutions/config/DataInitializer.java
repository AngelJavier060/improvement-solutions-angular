package com.improvementsolutions.config;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Inicializa datos básicos en la base de datos al arrancar la aplicación
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    @Transactional
    public void run(String... args) {
        log.info("Inicializando datos de la aplicación...");
        
        // Inicializar roles si no existen
        initializeRoles();
        
        // Inicializar usuario administrador si no existe
        initializeAdminUser();
        
        // Inicializar usuario Javier si no existe
        initializeJavierUser();
        
        log.info("Inicialización completada");
    }
      @Transactional
    private void initializeRoles() {
        // Crear o actualizar rol USER
        Role userRole;
        if (!roleRepository.existsByName("ROLE_USER")) {
            userRole = new Role();
            userRole.setName("ROLE_USER");
            userRole.setDescription("Usuario estándar");
            roleRepository.save(userRole);
            log.info("Rol ROLE_USER creado");
        }
        
        // Crear o actualizar rol ADMIN
        Role adminRole;
        if (!roleRepository.existsByName("ROLE_ADMIN")) {
            adminRole = new Role();
            adminRole.setName("ROLE_ADMIN");
            adminRole.setDescription("Usuario administrador");
            roleRepository.save(adminRole);
            log.info("Rol ROLE_ADMIN creado");
        } else {
            adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Error: No se pudo encontrar el rol ROLE_ADMIN"));
            adminRole.setDescription("Usuario administrador");
            roleRepository.save(adminRole);
            log.info("Rol ROLE_ADMIN actualizado");
        }
    }
    
    @Transactional
    private void initializeAdminUser() {
        // Verificar si ya existe un usuario administrador
        if (!userRepository.existsByUsername("admin")) {
            User adminUser = new User();
            adminUser.setUsername("admin");
            adminUser.setPassword(passwordEncoder.encode("admin123")); // Contraseña inicial
            adminUser.setEmail("admin@improvementsolutions.com");
            adminUser.setName("Administrador");
            adminUser.setActive(true);
            adminUser.setCreatedAt(LocalDateTime.now());
            adminUser.setUpdatedAt(LocalDateTime.now());
            
            // Asignar rol de administrador
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseThrow(() -> new RuntimeException("Error: Rol de administrador no encontrado"));
            
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            adminUser.setRoles(roles);
            
            userRepository.save(adminUser);
            log.info("Usuario administrador creado con username: admin y password: admin123");
        }
    }
      @Transactional
    private void initializeJavierUser() {
        // Verificar si ya existe el usuario Javier
        User javierUser = userRepository.findByUsername("javier")
                .orElseGet(() -> userRepository.findByEmail("javierangelmsn@outlook.es")
                        .orElse(null));

        if (javierUser == null) {
            // Crear nuevo usuario
            javierUser = new User();
            javierUser.setUsername("javier");
            javierUser.setPassword(passwordEncoder.encode("12345")); // Contraseña solicitada
            javierUser.setEmail("javierangelmsn@outlook.es");
            javierUser.setName("Javier");
            javierUser.setActive(true);
            javierUser.setCreatedAt(LocalDateTime.now());
            javierUser.setUpdatedAt(LocalDateTime.now());
        } else {
            // Actualizar usuario existente
            javierUser.setPassword(passwordEncoder.encode("12345")); // Asegurar que la contraseña es correcta
            javierUser.setActive(true);
            javierUser.setUpdatedAt(LocalDateTime.now());
        }

        // Asegurar que tiene el rol de administrador
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Error: Rol de administrador no encontrado"));
        
        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);
        javierUser.setRoles(roles);
        
        userRepository.save(javierUser);
        log.info("Usuario Javier {} con username: javier, email: javierangelmsn@outlook.es y password: 12345",
                javierUser == null ? "creado" : "actualizado");
    }
}
