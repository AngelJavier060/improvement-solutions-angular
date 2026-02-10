package com.improvementsolutions.config;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Component
@Profile("local")
@RequiredArgsConstructor
public class DataInitializerLocal implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
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

        User user = userRepository.findByUsername("Javier").orElse(null);
        if (user == null) {
            user = new User();
            user.setUsername("Javier");
            user.setEmail("javierangelmsn@outlook.es");
            user.setName("Javier");
            user.setActive(true);
            user.setPassword(passwordEncoder.encode("Alexandra123@"));
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            roles.add(superAdminRole);
            user.setRoles(roles);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        } else {
            user.setActive(true);
            user.setPassword(passwordEncoder.encode("Alexandra123@"));
            Set<Role> roles = user.getRoles() != null ? new HashSet<>(user.getRoles()) : new HashSet<>();
            roles.add(adminRole);
            roles.add(superAdminRole);
            user.setRoles(roles);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }
    }
}
