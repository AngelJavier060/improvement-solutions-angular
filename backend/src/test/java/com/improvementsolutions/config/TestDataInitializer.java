package com.improvementsolutions.config;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@RequiredArgsConstructor
public class TestDataInitializer {
    
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private static final AtomicInteger counter = new AtomicInteger(0);
    private int lastUsedId;

    @Transactional
    public int initializeTestData() {
        // Limpiar primero las sesiones de usuario
        userSessionRepository.deleteAll();
        
        // Limpiar completamente las tablas de usuarios y roles
        userRepository.deleteAll();
        roleRepository.deleteAll();
            
        // Generar sufijo único para esta ejecución
        lastUsedId = counter.incrementAndGet();
            
        // Inicializar roles para esta prueba
        Role adminRole = createRole("ROLE_ADMIN", "Rol de administrador para pruebas");
        Role userRole = createRole("ROLE_USER", "Rol de usuario para pruebas");
        Role testRole = createRole("ROLE_TEST_" + lastUsedId, "Rol específico para pruebas");
            
        // Crear usuario administrador de prueba con nombre único
        createUser(
            "admin_test_" + lastUsedId,
            "admin_password",
            "admin" + lastUsedId + "@test.com",
            "Admin Test " + lastUsedId,
            Set.of(adminRole, userRole)
        );
            
        // Crear usuario normal de prueba con nombre único
        createUser(
            "test_user_" + lastUsedId,
            "test_password",
            "test" + lastUsedId + "@example.com",
            "Test User " + lastUsedId,
            Set.of(userRole, testRole)
        );
        
        return lastUsedId;
    }
    
    public int getLastUsedId() {
        return lastUsedId;
    }
    
    private Role createRole(String name, String description) {
        // Verificar si el rol ya existe
        Optional<Role> existingRoleOpt = roleRepository.findByName(name);
        if (existingRoleOpt.isPresent()) {
            return existingRoleOpt.get();
        }
        
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        return roleRepository.save(role);
    }
    
    private User createUser(String username, String password, String email, String name, Set<Role> roles) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setName(name);
        user.setRoles(roles);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }
}
