package com.improvementsolutions.security;

import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        // Usuario específico para desarrollo sin base de datos
        if ("javier".equals(usernameOrEmail)) {
            // Crear autoridades para el usuario javier (ADMIN)
            List<SimpleGrantedAuthority> authorities = Arrays.asList(
                new SimpleGrantedAuthority("ROLE_ADMIN")
            );
            
            // Devolver un usuario de Spring Security con las credenciales hardcoded
            // La contraseña está codificada directamente aquí, corresponde a "12345"
            return new org.springframework.security.core.userdetails.User(
                "javier",
                // Contraseña precodificada para "12345"
                "$2a$10$iyH.Xiv1ASsMqL.yNen/0.1l98vhPF2U/BMJS/HMJQwkcHJtQSQD6",
                authorities
            );
        }
        
        // Lógica original para otros usuarios (desde la base de datos)
        try {
            // Permitir inicio de sesión con nombre de usuario o correo electrónico
            User user = userRepository.findByEmail(usernameOrEmail)
                    .orElseGet(() -> userRepository.findByUsername(usernameOrEmail)
                            .orElseThrow(() -> new UsernameNotFoundException(
                                    "Usuario no encontrado con nombre de usuario o email: " + usernameOrEmail)));
    
            List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority(role.getName()))
                    .collect(Collectors.toList());
    
            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    authorities
            );
        } catch (Exception e) {
            // Si hay cualquier error con la base de datos, lanzar UsernameNotFoundException
            throw new UsernameNotFoundException("Error al cargar usuario: " + e.getMessage());
        }
    }
}