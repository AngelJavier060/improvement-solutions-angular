package com.improvementsolutions.security;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.improvementsolutions.repository.UserSessionRepository;
import com.improvementsolutions.model.UserSession;
import java.time.LocalDateTime;

@Service
public class TokenValidationService {
    
    @Autowired
    private UserSessionRepository userSessionRepository;
    
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
        
        // Actualizar última actividad
        session.setLastActivity(LocalDateTime.now());
        userSessionRepository.save(session);
    }
}
