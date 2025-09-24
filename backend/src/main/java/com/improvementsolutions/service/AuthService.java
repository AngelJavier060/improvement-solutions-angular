package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.*;
import com.improvementsolutions.dto.auth.LoginResponseDto.UserInfoDto;
import com.improvementsolutions.exception.UserInactiveException;
import com.improvementsolutions.exception.UserNotFoundException;
import com.improvementsolutions.model.PasswordResetToken;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.repository.PasswordResetTokenRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import com.improvementsolutions.security.UserDetailsImpl;
import com.improvementsolutions.service.EmailService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserSessionRepository userSessionRepository;
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.frontend.base-url:https://improvement-solution.com}")
    private String frontendBaseUrl;

    private User findUserByEmailOrUsername(String email, String username) {
        User user = null;
        if (StringUtils.hasText(email)) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                logger.debug("Usuario encontrado por email: {}", email);
                return user;
            }
        }
        if (StringUtils.hasText(username)) {
            user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                logger.debug("Usuario encontrado por username: {}", username);
                return user;
            }
        }
        String mensaje = String.format("Usuario no encontrado. Email: %s, Username: %s", email != null ? email : "no proporcionado", username != null ? username : "no proporcionado");
        logger.error(mensaje);
        throw new UserNotFoundException(mensaje);
    }

    @Transactional
    public LoginResponseDto authenticateUser(LoginRequestDto loginRequest) {
        String username = loginRequest.getUsername();
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();
        if (!StringUtils.hasText(password)) {
            logger.warn("Intento de login sin contraseña");
            throw new BadCredentialsException("La contraseña es requerida");
        }
        if (!StringUtils.hasText(username) && !StringUtils.hasText(email)) {
            logger.warn("Intento de login sin identificador (ni username ni email)");
            throw new BadCredentialsException("Debe proporcionar un nombre de usuario o email");
        }
        User user = findUserByEmailOrUsername(email, username);
        validateUserStatus(user);
        Authentication authentication = authenticate(user.getUsername(), password);
        String jwt = jwtTokenProvider.generateToken(authentication);
        
        // Crear sesión en la base de datos
        createUserSession(user, jwt);
        
        return buildLoginResponse(authentication, jwt);
    }

    @Transactional
    public LoginResponseDto authenticateUser(LoginRequestDto loginRequest, String deviceInfo, String ipAddress) {
        // Implementación básica para compilar
        return authenticateUser(loginRequest); // Puedes adaptar la lógica según tu necesidad
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
    }

    private LoginResponseDto buildLoginResponse(Authentication authentication, String jwt) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
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
        
        // Buscar el usuario completo para obtener las empresas
        User user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
        if (user != null && user.getBusinesses() != null && !user.getBusinesses().isEmpty()) {
            List<LoginResponseDto.BusinessInfoDto> businesses = user.getBusinesses().stream()
                .map(business -> new LoginResponseDto.BusinessInfoDto(
                    business.getId(),
                    business.getName(),
                    business.getRuc(),
                    business.getEmail(),
                    business.getPhone()
                ))
                .collect(Collectors.toList());
            userInfo.setBusinesses(businesses);
            logger.debug("Usuario {} tiene {} empresas asociadas", user.getUsername(), businesses.size());
        } else {
            logger.debug("Usuario {} no tiene empresas asociadas", userDetails.getUsername());
        }
        
        response.setUserDetail(userInfo);
        return response;
    }

    // Métodos faltantes para compatibilidad con AuthController
    @Transactional
    public LoginResponseDto handleRegistration(RegisterRequestDto registerRequest) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("handleRegistration no implementado");
    }

    @Transactional
    public String handlePasswordResetRequest(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Usuario no encontrado para el email proporcionado"));

        // Eliminar tokens previos del usuario para evitar múltiples válidos
        try {
            passwordResetTokenRepository.deleteByUser(user);
        } catch (Exception e) {
            logger.debug("No se pudieron eliminar tokens previos: {}", e.getMessage());
        }

        // Crear y guardar un nuevo token válido por 24 horas
        String rawToken = UUID.randomUUID().toString();
        PasswordResetToken token = new PasswordResetToken();
        token.setToken(rawToken);
        token.setUser(user);
        token.setCreatedAt(LocalDateTime.now());
        token.setExpiryDate(LocalDateTime.now().plusHours(24));
        token.setUsed(false);
        passwordResetTokenRepository.save(token);

        // Construir enlace de restablecimiento para frontend
        String resetLink = frontendBaseUrl + "/auth/reset-password?token=" + rawToken;

        // Intentar enviar el correo (si el mail sender no está configurado, solo se loguea)
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), rawToken, frontendBaseUrl);
        } catch (Exception e) {
            logger.warn("Fallo enviando email de reset (continuando): {}", e.getMessage());
        }

        return resetLink;
    }

    @Transactional(readOnly = true)
    public boolean isResetTokenValid(String token) {
        try {
            PasswordResetToken prt = passwordResetTokenRepository.findByToken(token)
                    .orElse(null);
            if (prt == null) return false;
            if (prt.isExpired()) return false;
            if (prt.isUsed()) return false;
            return true;
        } catch (Exception e) {
            logger.warn("Error validando token de reset: {}", e.getMessage());
            return false;
        }
    }

    @Transactional
    public boolean handlePasswordReset(PasswordResetDto resetDto) {
        if (resetDto.getNewPassword() == null || resetDto.getConfirmPassword() == null
                || !resetDto.getNewPassword().equals(resetDto.getConfirmPassword())) {
            throw new IllegalArgumentException("Las contraseñas no coinciden");
        }

        PasswordResetToken prt = passwordResetTokenRepository.findByToken(resetDto.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Token inválido"));

        if (prt.isExpired()) {
            throw new IllegalArgumentException("El token ha expirado");
        }
        if (prt.isUsed()) {
            throw new IllegalArgumentException("El token ya ha sido utilizado");
        }

        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(resetDto.getNewPassword()));
        userRepository.save(user);

        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);

        // Opcional: limpiar otros tokens del usuario
        try {
            passwordResetTokenRepository.deleteByUser(user);
        } catch (Exception e) {
            logger.debug("No se pudieron limpiar tokens tras el uso: {}", e.getMessage());
        }

        return true;
    }

    @Transactional
    public boolean handlePasswordChange(String username, PasswordChangeDto changeDto) {
        if (changeDto == null) {
            throw new IllegalArgumentException("Solicitud inválida");
        }
        if (changeDto.getNewPassword() == null || changeDto.getConfirmPassword() == null
                || !changeDto.getNewPassword().equals(changeDto.getConfirmPassword())) {
            throw new IllegalArgumentException("Las contraseñas no coinciden");
        }

        // Buscar usuario por username o email
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username).orElse(null));
        if (user == null) {
            throw new UserNotFoundException("Usuario no encontrado para cambio de contraseña");
        }

        // Validar contraseña actual
        if (changeDto.getCurrentPassword() == null || !passwordEncoder.matches(changeDto.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("La contraseña actual no es correcta");
        }

        // Actualizar contraseña
        user.setPassword(passwordEncoder.encode(changeDto.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Opcional: invalidar otras sesiones del usuario (mejor práctica)
        try {
            // Obtener sesión actual desde el contexto (si se quisiera preservar) no es trivial aquí;
            // desactivamos todas las otras sesiones dejando que el front mantenga la actual o reloguee.
            List<UserSession> sessions = userSessionRepository.findActiveSessionsByUserId(user.getId());
            for (UserSession s : sessions) {
                s.setActive(false);
            }
            userSessionRepository.saveAll(sessions);
        } catch (Exception e) {
            logger.warn("No se pudieron invalidar sesiones tras cambio de contraseña: {}", e.getMessage());
        }

        return true;
    }

    @Transactional
    public void deactivateSession(String token) {
        if (token == null || token.isEmpty()) return;
        userSessionRepository.findByToken(token).ifPresent(session -> {
            session.setActive(false);
            session.setLastActivity(LocalDateTime.now());
            userSessionRepository.save(session);
        });
    }

    @Transactional
    public List<UserSession> getActiveSessions(Long userId) {
        if (userId == null) return java.util.Collections.emptyList();
        return userSessionRepository.findActiveSessionsByUserId(userId);
    }
    
    private void createUserSession(User user, String token) {
        try {
            UserSession session = new UserSession();
            session.setUser(user);
            session.setToken(token);
            session.setActive(true);
            session.setCreatedAt(java.time.LocalDateTime.now());
            session.setLastActivity(java.time.LocalDateTime.now());
            session.setExpiresAt(java.time.LocalDateTime.now().plusDays(1)); // Token válido por 1 día
            session.setIpAddress("127.0.0.1"); // IP por defecto
            session.setDeviceInfo("Web Browser"); // Dispositivo por defecto
            
            userSessionRepository.save(session);
            logger.debug("Sesión creada para usuario: {}", user.getUsername());
        } catch (Exception e) {
            logger.error("Error creando sesión para usuario {}: {}", user.getUsername(), e.getMessage());
        }
    }

    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        if (userId == null || sessionId == null) return;
        userSessionRepository.findById(sessionId).ifPresent(session -> {
            if (session.getUser() != null && session.getUser().getId().equals(userId)) {
                session.setActive(false);
                session.setLastActivity(LocalDateTime.now());
                userSessionRepository.save(session);
            }
        });
    }

    @Transactional
    public void revokeOtherSessions(Long userId, String currentToken) {
        if (userId == null) return;
        Long currentSessionId = null;
        try {
            if (currentToken != null) {
                currentSessionId = userSessionRepository.findByToken(currentToken)
                        .map(UserSession::getId).orElse(null);
            }
        } catch (Exception ignored) {}

        if (currentSessionId != null) {
            userSessionRepository.deactivateOtherSessions(userId, currentSessionId);
        } else {
            // Si no se identificó la sesión actual, desactivar todas
            List<UserSession> sessions = userSessionRepository.findActiveSessionsByUserId(userId);
            for (UserSession s : sessions) {
                s.setActive(false);
            }
            userSessionRepository.saveAll(sessions);
        }
    }
}
