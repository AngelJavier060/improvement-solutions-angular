package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.JwtAuthResponse;
import com.improvementsolutions.dto.auth.LoginRequest;
import com.improvementsolutions.dto.auth.RegisterRequest;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public JwtAuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(), 
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Obtener usuario para incluir información adicional en la respuesta
        User user = userRepository.findByEmail(loginRequest.getUsername())
                .orElseGet(() -> userRepository.findByUsername(loginRequest.getUsername())
                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado")));

        // Generar token JWT
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateToken(authentication); // En una implementación real, generaría un refresh token diferente

        // Preparar respuesta
        return JwtAuthResponse.builder()
                .token(jwt)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 horas
                .userDetail(mapUserToDTO(user))
                .build();
    }

    @Transactional
    public JwtAuthResponse register(RegisterRequest registerRequest) {
        // Verificar si el usuario ya existe
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("El correo electrónico ya está registrado");
        }

        // Crear nuevo usuario
        User user = new User();
        user.setName(registerRequest.getName());
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setPhone(registerRequest.getPhone());

        // Asignar rol de ADMIN por defecto
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Rol ADMIN no encontrado"));
        user.setRoles(Collections.singleton(adminRole));

        userRepository.save(user);

        // Autenticar al usuario para generar el token
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        registerRequest.getUsername(),
                        registerRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generar token JWT
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateToken(authentication);

        // Preparar respuesta
        return JwtAuthResponse.builder()
                .token(jwt)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 horas
                .userDetail(mapUserToDTO(user))
                .build();
    }

    @Transactional
    public User registerByBusiness(RegisterRequest registerRequest, String businessRuc) {
        // Verificar si el usuario ya existe
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("El correo electrónico ya está registrado");
        }

        // Encontrar el negocio por RUC
        Business business = businessRepository.findByRuc(businessRuc)
                .orElseThrow(() -> new RuntimeException("Negocio no encontrado con RUC: " + businessRuc));

        // Crear nuevo usuario
        User user = new User();
        user.setName(registerRequest.getName());
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setPhone(registerRequest.getPhone());
        // Añadir el negocio al conjunto de negocios
        user.getBusinesses().add(business);

        // Asignar rol de USER por defecto
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Rol USER no encontrado"));
        user.setRoles(Collections.singleton(userRole));

        return userRepository.save(user);
    }

    public JwtAuthResponse refreshToken(String refreshToken) {
        // En una implementación real, validaría el refresh token de manera diferente
        // y verificaría si expiró o fue revocado
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Refresh token inválido o expirado");
        }

        String username = tokenProvider.getUsernameFromJWT(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        // Crear una nueva autenticación
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                username, null, 
                user.getRoles().stream()
                    .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority(role.getName()))
                    .collect(Collectors.toList())
        );

        // Generar nuevo token JWT
        String newToken = tokenProvider.generateToken(authentication);
        String newRefreshToken = tokenProvider.generateToken(authentication);

        return JwtAuthResponse.builder()
                .token(newToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 horas
                .userDetail(mapUserToDTO(user))
                .build();
    }

    public Map<String, Object> getUserInfo() {
        // Obtener el usuario autenticado actualmente
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Map<String, Object> response = new HashMap<>();
        response.put("user", user);
        response.put("roles", user.getRoles());
        
        return response;
    }

    // Método auxiliar para mapear un usuario a un DTO
    private com.improvementsolutions.dto.UserDTO mapUserToDTO(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        // En una implementación real, también mapearías los permisos
        List<String> permissions = new ArrayList<>();

        com.improvementsolutions.dto.UserDTO userDTO = new com.improvementsolutions.dto.UserDTO();
        userDTO.setId(user.getId());
        userDTO.setName(user.getName());
        userDTO.setUsername(user.getUsername());
        userDTO.setEmail(user.getEmail());
        userDTO.setPhone(user.getPhone());
        userDTO.setRoles(roles);
        userDTO.setPermissions(permissions);
        
        // Si el usuario tiene un negocio asociado, mapearlo
        if (user.getFirstBusiness() != null) {
            com.improvementsolutions.dto.BusinessDTO businessDTO = new com.improvementsolutions.dto.BusinessDTO();
            Business business = user.getFirstBusiness();
            businessDTO.setId(business.getId());
            businessDTO.setRuc(business.getRuc());
            businessDTO.setName(business.getName());
            businessDTO.setAddress(business.getAddress());
            businessDTO.setEmail(business.getEmail());
            businessDTO.setLogo(business.getLogo());
            userDTO.setBusiness(businessDTO);
        }
        
        return userDTO;
    }
}