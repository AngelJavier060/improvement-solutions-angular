package com.improvementsolutions.security;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@Primary
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        // Intentar obtener usuario de la base de datos primero
        User user = null;
        
        try {
            user = userRepository.findByUsername(usernameOrEmail)
                .orElseGet(() -> userRepository.findByEmail(usernameOrEmail)
                    .orElse(null));
        } catch (Exception e) {
            throw new UsernameNotFoundException("Error al buscar usuario: " + e.getMessage());
        }

        // Si no se encuentra en la base de datos y es "javier", crear usuario hardcodeado
        if (user == null && "javier".equals(usernameOrEmail)) {
            user = new User();
            user.setId(1L);
            user.setUsername("javier");
            user.setEmail("javierangelmsn@outlook.es");
            user.setName("Javier");
            user.setPassword("$2a$10$iyH.Xiv1ASsMqL.yNen/0.1l98vhPF2U/BMJS/HMJQwkcHJtQSQD6");
            user.setActive(true);
            
            Set<Role> roles = new HashSet<>();
            Role adminRole = new Role();
            adminRole.setId(1L);
            adminRole.setName("ROLE_ADMIN");
            roles.add(adminRole);
            user.setRoles(roles);
        }

        if (user == null) {
            throw new UsernameNotFoundException("Usuario no encontrado: " + usernameOrEmail);
        }

        return UserDetailsImpl.build(user);
    }
}
