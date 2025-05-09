package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.LoginRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto;
import com.improvementsolutions.dto.auth.PasswordChangeDto;
import com.improvementsolutions.dto.auth.RegisterRequestDto;
import com.improvementsolutions.dto.auth.PasswordResetDto;
import com.improvementsolutions.dto.auth.LoginResponseDto.UserInfoDto;
import com.improvementsolutions.model.PasswordResetToken;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.PasswordResetTokenRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import com.improvementsolutions.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private EmailService emailService;
    
    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;
    
    // Tiempo de expiración del token de restablecimiento (en horas)
    private static final int EXPIRATION_TIME = 24;
    
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
    
    /**
     * Permite a un usuario cambiar su contraseña
     * @param username Nombre de usuario
     * @param passwordChangeDto Datos para el cambio de contraseña
     * @return true si el cambio fue exitoso, false en caso contrario
     */
    @Transactional
    public boolean changePassword(String username, PasswordChangeDto passwordChangeDto) {
        // Verificar que las contraseñas nuevas coincidan
        if (!passwordChangeDto.getNewPassword().equals(passwordChangeDto.getConfirmPassword())) {
            throw new RuntimeException("Las contraseñas nuevas no coinciden");
        }
        
        // Obtener el usuario
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        // Verificar la contraseña actual
        if (!passwordEncoder.matches(passwordChangeDto.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }
        
        // Verificar que la nueva contraseña sea diferente de la actual
        if (passwordEncoder.matches(passwordChangeDto.getNewPassword(), user.getPassword())) {
            throw new RuntimeException("La nueva contraseña debe ser diferente a la actual");
        }
        
        // Actualizar la contraseña
        user.setPassword(passwordEncoder.encode(passwordChangeDto.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        return true;
    }
    
    /**
     * Crea un token para restablecer la contraseña y lo envía por correo
     * @param email Correo electrónico del usuario
     * @return Token generado (solo para desarrollo)
     */
    @Transactional
    public String createPasswordResetToken(String email) {
        // Buscar el usuario por email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No existe un usuario con ese correo electrónico"));
        
        // Eliminar tokens anteriores para este usuario
        passwordResetTokenRepository.deleteByUser(user);
        
        // Generar un token único UUID
        String token = UUID.randomUUID().toString();
        
        // Crear y guardar el token en la base de datos
        PasswordResetToken passwordResetToken = new PasswordResetToken();
        passwordResetToken.setUser(user);
        passwordResetToken.setToken(token);
        passwordResetToken.setCreatedAt(LocalDateTime.now());
        passwordResetToken.setExpiryDate(LocalDateTime.now().plusHours(EXPIRATION_TIME));
        passwordResetTokenRepository.save(passwordResetToken);
        
        // Enviar correo electrónico con el enlace para restablecer la contraseña
        try {
            emailService.sendPasswordResetEmail(email, token, frontendUrl);
        } catch (Exception e) {
            // Registrar el error pero continuar, para no bloquear el proceso
            System.err.println("Error al enviar correo electrónico: " + e.getMessage());
        }
        
        // Solo para desarrollo, retornar el token
        return token;
    }
    
    /**
     * Valida un token de restablecimiento y cambia la contraseña si es válido
     * @param passwordResetDto Datos para el restablecimiento
     * @return true si se cambió la contraseña, false en caso contrario
     */
    @Transactional
    public boolean resetPassword(PasswordResetDto passwordResetDto) {
        // Verificar que las contraseñas nuevas coincidan
        if (!passwordResetDto.getNewPassword().equals(passwordResetDto.getConfirmPassword())) {
            throw new RuntimeException("Las contraseñas nuevas no coinciden");
        }
        
        // Buscar el token en la base de datos
        PasswordResetToken passwordResetToken = passwordResetTokenRepository.findByToken(passwordResetDto.getToken())
                .orElseThrow(() -> new RuntimeException("Token no válido"));
        
        // Verificar que el token no haya expirado
        if (passwordResetToken.isExpired()) {
            throw new RuntimeException("El token ha expirado");
        }
        
        // Verificar que el token no haya sido utilizado
        if (passwordResetToken.isUsed()) {
            throw new RuntimeException("El token ya ha sido utilizado");
        }
        
        // Obtener el usuario
        User user = passwordResetToken.getUser();
        
        // Verificar que la nueva contraseña sea diferente de la actual
        if (passwordEncoder.matches(passwordResetDto.getNewPassword(), user.getPassword())) {
            throw new RuntimeException("La nueva contraseña debe ser diferente a la actual");
        }
        
        // Actualizar la contraseña
        user.setPassword(passwordEncoder.encode(passwordResetDto.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Marcar el token como utilizado
        passwordResetToken.setUsed(true);
        passwordResetTokenRepository.save(passwordResetToken);
        
        return true;
    }
    
    /**
     * Valida si un token de restablecimiento es válido
     * @param token Token a validar
     * @return true si es válido, false en caso contrario
     */
    public boolean validatePasswordResetToken(String token) {
        return passwordResetTokenRepository.findByToken(token)
                .map(resetToken -> !resetToken.isExpired() && !resetToken.isUsed())
                .orElse(false);
    }
}