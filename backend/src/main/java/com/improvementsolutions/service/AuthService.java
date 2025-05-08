package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.LoginRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto;
import com.improvementsolutions.dto.auth.RegisterRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto.UserInfoDto;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import com.improvementsolutions.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * Autentica un usuario y genera un token JWT
     */
    public LoginResponseDto authenticateUser(LoginRequestDto loginRequest) {
        // Autenticar contra Spring Security
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );
        
        // Establecer la autenticación en el contexto de seguridad
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // Generar el token JWT
        String jwt = jwtTokenProvider.generateToken(authentication);
        
        // Obtener los detalles del usuario autenticado
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        // Actualizar la fecha de último login
        updateLastLogin(userDetails.getUsername());
        
        // Crear y devolver la respuesta
        LoginResponseDto response = new LoginResponseDto();
        response.setToken(jwt);
        response.setExpiresIn(86400L); // 24 horas en segundos
        
        // Configurar los detalles del usuario
        UserInfoDto userInfo = new UserInfoDto();
        userInfo.setId(userDetails.getId());
        userInfo.setUsername(userDetails.getUsername());
        userInfo.setEmail(userDetails.getEmail());
        userInfo.setName(userDetails.getName());
        
        // Obtener los roles del usuario
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        userInfo.setRoles(roles);
        
        response.setUserDetail(userInfo);
        
        return response;
    }
    
    /**
     * Registra un nuevo usuario en el sistema
     */
    @Transactional
    public void registerUser(RegisterRequestDto registerRequest) {
        // Verificar si el usuario ya existe
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("Error: El nombre de usuario ya está en uso");
        }
        
        // Verificar si el email ya existe
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Error: El email ya está en uso");
        }
        
        // Crear el nuevo usuario
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setName(registerRequest.getName());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        
        // Asignar roles
        Set<String> strRoles = registerRequest.getRoles();
        Set<Role> roles = new HashSet<>();
        
        if (strRoles == null || strRoles.isEmpty()) {
            // Si no se especifican roles, asignar el rol de usuario por defecto
            Role userRole = roleRepository.findByName("ROLE_USER")
                    .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado"));
            roles.add(userRole);
        } else {
            // Asignar los roles especificados
            strRoles.forEach(roleName -> {
                switch (roleName.toUpperCase()) {
                    case "ADMIN":
                        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                                .orElseThrow(() -> new RuntimeException("Error: Rol de administrador no encontrado"));
                        roles.add(adminRole);
                        break;
                    default:
                        Role userRole = roleRepository.findByName("ROLE_USER")
                                .orElseThrow(() -> new RuntimeException("Error: Rol de usuario no encontrado"));
                        roles.add(userRole);
                        break;
                }
            });
        }
        
        user.setRoles(roles);
        userRepository.save(user);
    }
    
    /**
     * Actualiza la fecha de último acceso de un usuario
     */
    @Transactional
    public void updateLastLogin(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }
}