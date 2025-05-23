package com.improvementsolutions.repository;

import com.improvementsolutions.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    Optional<UserSession> findByToken(String token);
    
    List<UserSession> findByUserId(Long userId);
    
    @Query("SELECT s FROM UserSession s WHERE s.user.id = :userId AND s.active = true")
    List<UserSession> findActiveSessionsByUserId(Long userId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.user.id = :userId AND s.id != :currentSessionId")
    void deactivateOtherSessions(Long userId, Long currentSessionId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.lastActivity = :now WHERE s.token = :token")
    void updateLastActivity(String token, LocalDateTime now);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.expiresAt < :now")
    void deactivateExpiredSessions(LocalDateTime now);
}
