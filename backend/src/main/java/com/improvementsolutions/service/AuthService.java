package com.improvementsolutions.service;

import com.improvementsolutions.dto.auth.*;
import com.improvementsolutions.dto.auth.LoginResponseDto.UserInfoDto;
import com.improvementsolutions.exception.UserInactiveException;
import com.improvementsolutions.exception.UserNotFoundException;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import com.improvementsolutions.security.JwtTokenProvider;
import com.improvementsolutions.security.UserDetailsImpl;

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

import java.util.List;
import java.util.stream.Collectors;

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
    public boolean handlePasswordResetRequest(String email) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("handlePasswordResetRequest no implementado");
    }

    @Transactional
    public boolean handlePasswordReset(PasswordResetDto resetDto) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("handlePasswordReset no implementado");
    }

    @Transactional
    public boolean handlePasswordChange(String username, PasswordChangeDto changeDto) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("handlePasswordChange no implementado");
    }

    @Transactional
    public void deactivateSession(String token) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("deactivateSession no implementado");
    }

    @Transactional
    public List<UserSession> getActiveSessions(Long userId) {
        // Implementación básica para compilar
        return new java.util.ArrayList<>();
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
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("revokeSession no implementado");
    }

    @Transactional
    public void revokeOtherSessions(Long userId, String currentToken) {
        // Implementación básica: solo para compilar
        throw new UnsupportedOperationException("revokeOtherSessions no implementado");
    }
}
