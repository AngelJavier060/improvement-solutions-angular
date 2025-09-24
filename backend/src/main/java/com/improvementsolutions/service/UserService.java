package com.improvementsolutions.service;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.ApprovalRequestRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import com.improvementsolutions.repository.PasswordResetTokenRepository;
import com.improvementsolutions.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
      private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final BusinessRepository businessRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.improvementsolutions.storage.StorageService fileStorageService;
    private final ApprovalRequestRepository approvalRequestRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * Obtiene todos los usuarios con roles usando JOIN FETCH para evitar LazyInitializationException
     */
    public List<User> findAllWithRoles() {
        return userRepository.findAllWithRoles();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public User create(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email ya está en uso");
        }
        
        if (user.getUsername() != null && userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Nombre de usuario ya está en uso");
        }
        
        // Encriptar contraseña
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // Asignar rol por defecto si no tiene roles asignados
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("ROLE_USER")
                    .ifPresent(roles::add);
            user.setRoles(roles);
        }
        
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, User userDetails) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        if (!user.getEmail().equals(userDetails.getEmail()) && 
                userRepository.existsByEmail(userDetails.getEmail())) {
            throw new RuntimeException("Email ya está en uso");
        }
        
        if (userDetails.getUsername() != null && 
                !user.getUsername().equals(userDetails.getUsername()) && 
                userRepository.existsByUsername(userDetails.getUsername())) {
            throw new RuntimeException("Nombre de usuario ya está en uso");
        }
        
        user.setName(userDetails.getName());
        user.setEmail(userDetails.getEmail());
        
        if (userDetails.getUsername() != null) {
            user.setUsername(userDetails.getUsername());
        }
        
        if (userDetails.getPhone() != null) {
            user.setPhone(userDetails.getPhone());
        }
        
        // Solo actualiza la contraseña si se proporciona una nueva
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        
        // Actualiza roles si se proporcionan
        if (userDetails.getRoles() != null && !userDetails.getRoles().isEmpty()) {
            user.setRoles(userDetails.getRoles());
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        // Cargar entidad para poder limpiar relaciones seguras
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // 1) Eliminar todas las sesiones del usuario para evitar FK con user_sessions
        List<UserSession> userSessions = userSessionRepository.findByUserId(id);
        if (!userSessions.isEmpty()) {
            userSessionRepository.deleteAll(userSessions);
            log.info("Eliminadas {} sesiones del usuario con ID: {}", userSessions.size(), id);
        }

        // 2) Eliminar tokens de reseteo de contraseña que referencian al usuario (FK en password_reset_tokens)
        try {
            passwordResetTokenRepository.deleteByUser(user);
        } catch (Exception e) {
            log.warn("Error eliminando tokens de reseteo para usuario {}: {}", id, e.getMessage());
        }

        // 3) Limpiar asociaciones ManyToMany en user_roles para evitar FK (no hay ON DELETE CASCADE)
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            user.getRoles().clear();
            userRepository.save(user);
            log.info("Roles limpiados para usuario {}", id);
        }

        // 3.1) Limpieza defensiva: eliminar filas en tablas de unión por SQL nativo (para esquemas legados)
        try {
            userRepository.deleteFromUserRoles(id); // Tabla actual según migraciones
        } catch (Exception e) {
            log.warn("No se pudo limpiar tabla user_roles para usuario {}: {}", id, e.getMessage());
        }

        // 3.2) Limpiar referencias en ApprovalRequest (requester/decisionBy) que bloquean la eliminación por FK
        try {
            approvalRequestRepository.clearDecisionByForUser(user);
            approvalRequestRepository.deleteByRequester(user);
            log.info("Limpieza de referencias en ApprovalRequest completada para usuario {}", id);
        } catch (Exception e) {
            log.warn("No se pudo limpiar ApprovalRequest para usuario {}: {}", id, e.getMessage());
        }

        // 4) (Opcional) Limpiar asociaciones con empresas; la tabla user_business tiene ON DELETE CASCADE,
        // pero lo limpiamos como precaución para evitar inconsistencias en el contexto de persistencia
        if (user.getBusinesses() != null && !user.getBusinesses().isEmpty()) {
            user.getBusinesses().clear();
            userRepository.save(user);
            log.info("Asociaciones de empresa limpiadas para usuario {}", id);
        }

        // 4.1) Desasociar empresas cuyo created_by es este usuario (FK en businesses.created_by)
        try {
            List<com.improvementsolutions.model.Business> createdBusinesses = businessRepository.findByCreatedBy(user);
            if (createdBusinesses != null && !createdBusinesses.isEmpty()) {
                for (com.improvementsolutions.model.Business b : createdBusinesses) {
                    b.setCreatedBy(null);
                }
                businessRepository.saveAll(createdBusinesses);
                log.info("Removido created_by en {} empresas para usuario {}", createdBusinesses.size(), id);
            }
        } catch (Exception e) {
            log.warn("No se pudo limpiar created_by para usuario {}: {}", id, e.getMessage());
        }

        // 4.2) (Opcional) eliminar archivo de foto de perfil
        try {
            if (user.getProfilePicture() != null && !user.getProfilePicture().isEmpty()) {
                fileStorageService.delete(user.getProfilePicture());
            }
        } catch (Exception e) {
            log.warn("No se pudo eliminar la foto de perfil del usuario {}: {}", id, e.getMessage());
        }

        // 5) Eliminar usuario
        userRepository.delete(user);
        log.info("Usuario con ID {} eliminado exitosamente", id);
    }
    
    @Transactional
    public void addRoleToUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        
        user.getRoles().add(role);
        userRepository.save(user);
    }
      @Transactional
    public void removeRoleFromUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        
        user.getRoles().remove(role);
        userRepository.save(user);
    }
    
    @Transactional
    public User updateAdmin(Long id, com.improvementsolutions.dto.user.UserUpdateDto userDetails) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        // Normalizar entradas (trim) y tratar vacíos como "sin cambio"
        String newUsername = userDetails.getUsername() != null ? userDetails.getUsername().trim() : null;
        String newEmail = userDetails.getEmail() != null ? userDetails.getEmail().trim() : null;
        String newName = userDetails.getName() != null ? userDetails.getName().trim() : null;
        String newPhone = userDetails.getPhone() != null ? userDetails.getPhone().trim() : null;
        String newPassword = userDetails.getPassword() != null ? userDetails.getPassword().trim() : null;

        // Unicidad de email (solo si cambia y no está vacío)
        if (newEmail != null && !newEmail.isEmpty() && !user.getEmail().equals(newEmail) &&
                userRepository.existsByEmail(newEmail)) {
            throw new RuntimeException("Email ya está en uso");
        }

        // Unicidad de username (solo si cambia y no está vacío)
        if (newUsername != null && !newUsername.isEmpty() && !user.getUsername().equals(newUsername) &&
                userRepository.existsByUsername(newUsername)) {
            throw new RuntimeException("Nombre de usuario ya está en uso");
        }

        // Asignaciones condicionales (no sobrescribir con vacío)
        if (newName != null && !newName.isEmpty()) {
            user.setName(newName);
        }

        if (newEmail != null && !newEmail.isEmpty()) {
            user.setEmail(newEmail);
        }

        if (newUsername != null && !newUsername.isEmpty()) {
            user.setUsername(newUsername);
        }

        if (newPhone != null && !newPhone.isEmpty()) {
            user.setPhone(newPhone);
        }

        if (userDetails.getActive() != null) {
            user.setActive(userDetails.getActive());
        }

        // Solo actualiza la contraseña si se proporciona y no está en blanco; valida longitud cuando aplica
        if (newPassword != null && !newPassword.isEmpty()) {
            if (newPassword.length() < 6 || newPassword.length() > 100) {
                throw new RuntimeException("La contraseña debe tener entre 6 y 100 caracteres");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }
        
        // Actualiza roles si se proporcionan IDs de roles
        if (userDetails.getRoleIds() != null && !userDetails.getRoleIds().isEmpty()) {
            Set<Role> roles = userDetails.getRoleIds().stream()
                    .map(roleId -> roleRepository.findById(roleId)
                            .orElseThrow(() -> new RuntimeException("Rol no encontrado con ID: " + roleId)))
                    .collect(java.util.stream.Collectors.toSet());
            user.setRoles(roles);
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
      @Transactional
    public String updateProfilePicture(Long userId, org.springframework.web.multipart.MultipartFile file) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
              // Eliminar foto anterior si existe
            if (user.getProfilePicture() != null && !user.getProfilePicture().isEmpty()) {
                try {
                    fileStorageService.delete(user.getProfilePicture());
                } catch (Exception e) {
                    // Log error but continue
                    System.err.println("Error eliminando foto de perfil anterior: " + e.getMessage());
                }
            }
            
            // Generar un nombre de archivo basado en el nombre de usuario
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            // Crear un nombre de archivo basado en el nombre de usuario y un timestamp para evitar colisiones
            String safeUsername = user.getUsername().replaceAll("[^a-zA-Z0-9]", "_");
            String uniqueFileName = safeUsername + "_" + System.currentTimeMillis() + fileExtension;
            
            // Guardar nueva foto con el nombre personalizado
            String profilePicturePath = fileStorageService.store("profiles", file, uniqueFileName);
            
            // Actualizar referencia en el usuario
            user.setProfilePicture(profilePicturePath);
            user.setUpdatedAt(java.time.LocalDateTime.now()); // Actualizar timestamp para invalidar caché
            userRepository.save(user);
            
            return profilePicturePath;
        } catch (Exception e) {
            throw new RuntimeException("Error al actualizar foto de perfil: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    public User toggleUserActive(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        // Alternar estado activo (null-safe)
        boolean current = Boolean.TRUE.equals(user.getActive());
        boolean newActive = !current;

        // Reglas de negocio para producción: no permitir desactivar último admin ni auto-desactivarse
        if (!newActive) { // se intenta desactivar
            // 1) No permitir auto-desactivarse
            try {
                Authentication auth = SecurityContextHolder.getContext() != null ? SecurityContextHolder.getContext().getAuthentication() : null;
                if (auth != null && auth.isAuthenticated()) {
                    String currentUsername = auth.getName();
                    if (currentUsername != null && currentUsername.equals(user.getUsername())) {
                        throw new IllegalStateException("No puedes desactivar tu propio usuario");
                    }
                }
            } catch (IllegalStateException ex) {
                throw ex;
            } catch (Exception e) {
                // si falla obtención de autenticación, continuamos sin bloquear por esta regla
            }

            // 2) No permitir desactivar al último administrador activo
            boolean isAdmin = user.getRoles() != null && user.getRoles().stream().anyMatch(r -> "ROLE_ADMIN".equals(r.getName()));
            if (isAdmin) {
                long activeAdmins = userRepository.countActiveUsersByRoleName("ROLE_ADMIN");
                if (activeAdmins <= 1) {
                    throw new IllegalStateException("No se puede desactivar al último administrador activo");
                }
            }
        }

        user.setActive(newActive);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }
    
    public void updateLastLogin(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }
    @Transactional
    public Map<String, Object> deleteWithReport(Long id, boolean force) {
        Map<String, Object> report = new LinkedHashMap<>();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // 1) Eliminar sesiones
        List<UserSession> sessions = userSessionRepository.findByUserId(id);
        int removedSessions = sessions != null ? sessions.size() : 0;
        if (removedSessions > 0) {
            userSessionRepository.deleteAll(sessions);
        }
        report.put("removedSessions", removedSessions);

        // 2) Eliminar tokens de reseteo
        long resetTokens = 0L;
        try {
            resetTokens = passwordResetTokenRepository.countByUser(user);
            passwordResetTokenRepository.deleteByUser(user);
        } catch (Exception e) {
            // continuar
        }
        report.put("removedResetTokens", resetTokens);

        // 3) Limpiar roles (user_roles)
        int rolesCount = user.getRoles() != null ? user.getRoles().size() : 0;
        if (rolesCount > 0) {
            user.getRoles().clear();
            userRepository.save(user);
        }
        report.put("clearedRoles", rolesCount);
        boolean userRoleRowsDeleted = false;
        try {
            userRepository.deleteFromUserRoles(id);
            userRoleRowsDeleted = true;
        } catch (Exception e) {
            // continuar
        }
        report.put("userRoleRowsDeleted", userRoleRowsDeleted);

        // 3.2) Limpiar referencias en ApprovalRequest
        int approvalDecisionCleared = 0;
        int approvalRequestsDeleted = 0;
        try {
            approvalDecisionCleared = approvalRequestRepository.clearDecisionByForUser(user);
            approvalRequestsDeleted = approvalRequestRepository.deleteByRequester(user);
        } catch (Exception e) {
            // continuar
        }
        report.put("approvalDecisionCleared", approvalDecisionCleared);
        report.put("approvalRequestsDeleted", approvalRequestsDeleted);

        // 4) Limpiar asociaciones con empresas (user_business)
        int businessesAssoc = user.getBusinesses() != null ? user.getBusinesses().size() : 0;
        if (businessesAssoc > 0) {
            user.getBusinesses().clear();
            userRepository.save(user);
        }
        report.put("clearedBusinessesAssociations", businessesAssoc);

        // 4.1) Quitar created_by en empresas
        int createdByCleared = 0;
        try {
            List<com.improvementsolutions.model.Business> createdBusinesses = businessRepository.findByCreatedBy(user);
            if (createdBusinesses != null && !createdBusinesses.isEmpty()) {
                createdByCleared = createdBusinesses.size();
                for (com.improvementsolutions.model.Business b : createdBusinesses) {
                    b.setCreatedBy(null);
                }
                businessRepository.saveAll(createdBusinesses);
            }
        } catch (Exception e) {
            // continuar
        }
        report.put("clearedCreatedByOnBusinesses", createdByCleared);

        // 4.2) Eliminar foto de perfil si existe
        boolean profilePictureDeleted = false;
        try {
            if (user.getProfilePicture() != null && !user.getProfilePicture().isEmpty()) {
                fileStorageService.delete(user.getProfilePicture());
                profilePictureDeleted = true;
            }
        } catch (Exception e) {
            // continuar
        }
        report.put("profilePictureDeleted", profilePictureDeleted);

        // 5) Eliminar usuario
        userRepository.delete(user);
        report.put("userDeleted", true);
        report.put("forced", force);

        return report;
    }
}
