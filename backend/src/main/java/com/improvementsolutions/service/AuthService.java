package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.*;
import com.improvementsolutions.dto.auth.LoginResponseDto.UserInfoDto;
import com.improvementsolutions.exception.UserInactiveException;
import com.improvementsolutions.exception.UserNotFoundException;
import com.improvementsolutions.model.PasswordResetToken;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.repository.PasswordResetTokenRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import com.improvementsolutions.security.UserDetailsImpl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final int EXPIRATION_TIME = 24;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    
    @Autowired
    private UserSessionRepository userSessionRepository;
    
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
    
    @Value("${app.session.max-per-user:5}")
    private int maxSessionsPerUser;
    
    @Value("${app.session.expiration-hours:24}")
    private int sessionExpirationHours;

    private User findUserByEmailOrUsername(String email, String username) {
        User user = null;
        
        // Primero intentar con email si se proporciona
        if (StringUtils.hasText(email)) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                logger.debug("Usuario encontrado por email: {}", email);
                return user;
            } else {
                logger.debug("No se encontró usuario con email: {}", email);
            }
        }
        
        // Si no se encontró por email o no se proporcionó, intentar con username
        if (StringUtils.hasText(username)) {
            user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                logger.debug("Usuario encontrado por username: {}", username);
                return user;
            } else {
                logger.debug("No se encontró usuario con username: {}", username);
            }
        }

        // Si llegamos aquí, no se encontró el usuario
        String mensaje = String.format("Usuario no encontrado. Email: %s, Username: %s", 
            email != null ? email : "no proporcionado",
            username != null ? username : "no proporcionado");
        logger.error(mensaje);
        throw new UserNotFoundException(mensaje);
    }    @Transactional
    public LoginResponseDto authenticateUser(LoginRequestDto loginRequest, String deviceInfo, String ipAddress) {
        try {
            logger.debug("Iniciando autenticación para request: {}", loginRequest);
            
            // Validar que se proporcione al menos un identificador
            String username = loginRequest.getUsername();
            String email = loginRequest.getEmail();
            String password = loginRequest.getPassword();

            if (!StringUtils.hasText(password)) {
                logger.error("Intento de login sin contraseña");
                throw new BadCredentialsException("La contraseña es requerida");
            }

            if (!StringUtils.hasText(username) && !StringUtils.hasText(email)) {
                logger.error("Intento de login sin identificador (ni username ni email)");
                throw new BadCredentialsException("Debe proporcionar un nombre de usuario o email");
            }

            // Buscar usuario por email o username
            User user = findUserByEmailOrUsername(email, username);
            logger.debug("Usuario encontrado: {}", user.getUsername());

            // Verificar estado del usuario
            validateUserStatus(user);

            try {
                // Intentar autenticar
                Authentication authentication = authenticate(user.getUsername(), password);
                
                // Generar token JWT
                String jwt = jwtTokenProvider.generateToken(authentication);
                
                // Crear sesión de usuario
                createUserSession(user, jwt, deviceInfo, ipAddress);
                
                logger.debug("Autenticación exitosa para usuario: {}", user.getUsername());
                
                // Construir y devolver respuesta
                return buildLoginResponse(authentication, jwt);
            } catch (BadCredentialsException e) {
                logger.error("Contraseña incorrecta para usuario: {}", user.getUsername());
                throw new BadCredentialsException("Contraseña incorrecta");
            }

        } catch (UserNotFoundException e) {
            logger.error("Usuario no encontrado: {}", e.getMessage());
            throw e;
        } catch (UserInactiveException e) {
            logger.error("Usuario inactivo: {}", e.getMessage());
            throw e;
        } catch (BadCredentialsException e) {
            logger.error("Error de credenciales: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error inesperado en autenticación: {}", e.getMessage(), e);
            throw new RuntimeException("Error en la autenticación: " + e.getMessage());
        }
    }

    private void validateUserStatus(User user) {
        if (user.getActive() != null && !user.getActive()) {
            throw new UserInactiveException("Usuario inactivo. Por favor, contacte al administrador.");
        }
    }

    private Authentication authenticate(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, password)
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return authentication;
    }    private LoginResponseDto buildLoginResponse(Authentication authentication, String jwt) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        // Actualizar último acceso
        updateLastLogin(userDetails.getUsername());
        
        // Construir respuesta
        LoginResponseDto response = new LoginResponseDto();
        response.setToken(jwt);
        response.setTokenType("Bearer");
        response.setExpiresIn(86400L);
        
        UserInfoDto userInfo = new UserInfoDto();
        userInfo.setId(userDetails.getId());
        userInfo.setUsername(userDetails.getUsername());
        userInfo.setEmail(userDetails.getEmail());
        userInfo.setName(userDetails.getName());
        
        List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
        
        userInfo.setRoles(roles);
        response.setUserDetail(userInfo);
        
        return response;
    }    @Transactional
    public void updateLastLogin(String username) {
        try {
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("Usuario no encontrado"));
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            logger.debug("Actualizado último acceso para usuario: {}", username);
        } catch (Exception e) {
            logger.error("Error al actualizar último acceso para usuario {}: {}", username, e.getMessage());
            throw new RuntimeException("Error al actualizar el último acceso");
        }
    }
    
    public LoginResponseDto handleRegistration(RegisterRequestDto registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setName(registerRequest.getName());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setActive(true);

        Set<Role> roles = new HashSet<>();
        if (registerRequest.getRoles() != null && !registerRequest.getRoles().isEmpty()) {
            registerRequest.getRoles().forEach(roleName -> {
                Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new RuntimeException("Error: Rol no encontrado."));
                roles.add(role);
            });
        } else {
            Role defaultRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Error: Rol por defecto no encontrado."));
            roles.add(defaultRole);
        }
        user.setRoles(roles);

        userRepository.save(user);
        
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(registerRequest.getUsername(), registerRequest.getPassword())
        );
        
        String jwt = jwtTokenProvider.generateToken(authentication);
        
        return handleLogin(authentication, jwt);
    }

    public LoginResponseDto handleLogin(Authentication authentication, String jwt) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
        
        LoginResponseDto response = new LoginResponseDto();
        response.setToken(jwt);
        response.setTokenType("Bearer");
        response.setExpiresIn(86400L);
        
        UserInfoDto userInfo = new UserInfoDto();
        userInfo.setId(userDetails.getId());
        userInfo.setUsername(userDetails.getUsername());
        userInfo.setEmail(userDetails.getEmail());
        userInfo.setName(userDetails.getName());
        userInfo.setRoles(roles);
        
        response.setUserDetail(userInfo);
        return response;
    }

    public LoginResponseDto handleTokenRefresh(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Refresh token inválido o expirado");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userDetails, null, userDetails.getAuthorities()
        );
            
        String jwt = jwtTokenProvider.generateToken(authentication);
        
        return handleLogin(authentication, jwt);
    }

    public boolean handlePasswordResetRequest(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String token = UUID.randomUUID().toString();
        createPasswordResetTokenForUser(user, token);
        emailService.sendPasswordResetEmail(user.getEmail(), token, frontendUrl);
        
        return true;
    }

    public boolean handlePasswordReset(PasswordResetDto resetDto) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(resetDto.getToken())
            .orElseThrow(() -> new RuntimeException("Token inválido"));

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token expirado");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(resetDto.getNewPassword()));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        
        return true;
    }

    public boolean handlePasswordChange(String username, PasswordChangeDto changeDto) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!passwordEncoder.matches(changeDto.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Contraseña actual incorrecta");
        }

        user.setPassword(passwordEncoder.encode(changeDto.getNewPassword()));
        userRepository.save(user);
        
        return true;
    }

    private void createPasswordResetTokenForUser(User user, String token) {
        PasswordResetToken myToken = new PasswordResetToken();
        myToken.setUser(user);
        myToken.setToken(token);
        myToken.setExpiryDate(LocalDateTime.now().plusHours(EXPIRATION_TIME));
        passwordResetTokenRepository.save(myToken);
    }

    @Transactional
    public UserSession createUserSession(User user, String token, String deviceInfo, String ipAddress) {
        // Limpiar sesiones expiradas
        userSessionRepository.deactivateExpiredSessions(LocalDateTime.now());
        
        // Obtener sesiones activas del usuario
        List<UserSession> activeSessions = userSessionRepository.findActiveSessionsByUserId(user.getId());
        
        // Si excede el límite, desactivar la sesión más antigua
        if (activeSessions.size() >= maxSessionsPerUser) {
            activeSessions.stream()
                .min(Comparator.comparing(UserSession::getLastActivity))
                .ifPresent(oldestSession -> {
                    oldestSession.setActive(false);
                    userSessionRepository.save(oldestSession);
                });
        }
        
        // Crear nueva sesión
        UserSession session = new UserSession();
        session.setUser(user);
        session.setToken(token);
        session.setDeviceInfo(deviceInfo);
        session.setIpAddress(ipAddress);
        session.setLastActivity(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(sessionExpirationHours));
        
        return userSessionRepository.save(session);
    }
    
    @Transactional
    public void updateSessionActivity(String token) {
        userSessionRepository.updateLastActivity(token, LocalDateTime.now());
    }
    
    @Transactional
    public void deactivateSession(String token) {
        userSessionRepository.findByToken(token).ifPresent(session -> {
            session.setActive(false);
            userSessionRepository.save(session);
        });
    }
    
    @Transactional
    public void deactivateAllUserSessions(Long userId) {
        List<UserSession> sessions = userSessionRepository.findByUserId(userId);
        sessions.forEach(session -> {
            session.setActive(false);
            userSessionRepository.save(session);
        });
    }
    
    @Transactional
    public void validateSession(String token) {
        UserSession session = userSessionRepository.findByToken(token)
            .orElseThrow(() -> new RuntimeException("Sesión no encontrada"));
            
        if (!session.isActive()) {
            throw new RuntimeException("Sesión inactiva");
        }
        
        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setActive(false);
            userSessionRepository.save(session);
            throw new RuntimeException("Sesión expirada");
        }
        
        updateSessionActivity(token);
    }

    @Transactional
    public List<UserSession> getActiveSessions(Long userId) {
        return userSessionRepository.findActiveSessionsByUserId(userId);
    }
    
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        UserSession session = userSessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Sesión no encontrada"));
            
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("No autorizado para revocar esta sesión");
        }
        
        session.setActive(false);
        userSessionRepository.save(session);
    }
    
    @Transactional
    public void revokeOtherSessions(Long userId, String currentToken) {
        UserSession currentSession = userSessionRepository.findByToken(currentToken)
            .orElseThrow(() -> new RuntimeException("Sesión actual no encontrada"));
            
        if (!currentSession.getUser().getId().equals(userId)) {
            throw new RuntimeException("No autorizado para revocar sesiones");
        }
        
        userSessionRepository.deactivateOtherSessions(userId, currentSession.getId());
    }

    @Scheduled(fixedRate = 3600000) // Ejecutar cada hora
    @Transactional
    public void cleanupExpiredSessions() {
        userSessionRepository.deactivateExpiredSessions(LocalDateTime.now());
    }
}
