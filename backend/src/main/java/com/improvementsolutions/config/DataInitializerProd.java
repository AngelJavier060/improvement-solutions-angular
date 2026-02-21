package com.improvementsolutions.config;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Component
@Profile({"prod", "postgres"})
@RequiredArgsConstructor
@Slf4j
public class DataInitializerProd implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${SUPER_ADMIN_USERNAME:Javier}")
    private String superAdminUsername;

    @Value("${SUPER_ADMIN_EMAIL:javierangelmsn@outlook.es}")
    private String superAdminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        // Contraseña fija y conocida para el superusuario en todos los entornos
        final String fixedSuperAdminPassword = "Alexandra123@";

        // Asegurar roles requeridos
        Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ROLE_ADMIN");
            r.setDescription("Usuario administrador");
            return roleRepository.save(r);
        });

        Role superAdminRole = roleRepository.findByName("ROLE_SUPER_ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ROLE_SUPER_ADMIN");
            r.setDescription("Super usuario del sistema");
            return roleRepository.save(r);
        });

        User user = userRepository.findByUsername(superAdminUsername).orElse(null);
        if (user == null) {
            user = new User();
            user.setUsername(superAdminUsername);
            user.setEmail(superAdminEmail);
            user.setName("Super Admin");
            user.setActive(true);
            user.setPassword(passwordEncoder.encode(fixedSuperAdminPassword));
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            roles.add(superAdminRole);
            user.setRoles(roles);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("Super Usuario creado en PROD: {} ({})", superAdminUsername, superAdminEmail);
        } else {
            // Asegurar que la contraseña del superusuario sea siempre la fija configurada
            user.setPassword(passwordEncoder.encode(fixedSuperAdminPassword));
            Set<Role> roles = user.getRoles() != null ? new HashSet<>(user.getRoles()) : new HashSet<>();
            roles.add(adminRole);
            roles.add(superAdminRole);
            user.setRoles(roles);
            user.setActive(true);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("Super Usuario ya existía. Roles, estado y contraseña fija asegurados para {}", superAdminUsername);
        }
    }
}
