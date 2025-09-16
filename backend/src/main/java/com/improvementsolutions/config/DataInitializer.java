package com.improvementsolutions.config;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
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
import java.util.List;
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
    private final BusinessRepository businessRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    @Transactional
    public void run(String... args) {
        log.info("Inicializando datos de la aplicación...");
        
        // Inicializar roles si no existen
        initializeRoles();
        
        // Inicializar usuario administrador global si no existe
        initializeAdminUser();
        
        // Asegurar que los usuarios existentes tengan las asociaciones correctas con empresas
        ensureUserBusinessAssociations();
        
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
    private void ensureUserBusinessAssociations() {
        // Obtener todos los usuarios existentes
        List<User> allUsers = userRepository.findAll();
        List<Business> allBusinesses = businessRepository.findAll();
        
        log.info("=== REVISIÓN DE USUARIOS Y EMPRESAS EXISTENTES ===");
        log.info("Usuarios encontrados: {}", allUsers.size());
        log.info("Empresas encontradas: {}", allBusinesses.size());
        
        for (User user : allUsers) {
            log.info("Usuario: {} ({}), Empresas asociadas: {}", 
                user.getUsername(), user.getName(), user.getBusinesses().size());
        }
        
        for (Business business : allBusinesses) {
            log.info("Empresa: {} ({}), Usuarios asociados: {}", 
                business.getName(), business.getRuc(), business.getUsers().size());
        }
        
        // Aquí puedes agregar lógica específica para asociar usuarios con empresas
        // según tus reglas de negocio
        if (!allBusinesses.isEmpty() && !allUsers.isEmpty()) {
            // Por ejemplo, asociar todos los usuarios administradores con todas las empresas
            Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElse(null);
            if (adminRole != null) {
                for (User user : allUsers) {
                    if (user.getRoles().contains(adminRole) && user.getBusinesses().isEmpty()) {
                        // Asociar el usuario admin con al menos una empresa si no tiene ninguna
                        Business firstBusiness = allBusinesses.get(0);
                        user.addBusiness(firstBusiness);
                        userRepository.save(user);
                        log.info("Usuario {} asociado con empresa {}", user.getUsername(), firstBusiness.getName());
                    }
                }
            }
        }
        
        log.info("=== FIN REVISIÓN ===");
    }
}
