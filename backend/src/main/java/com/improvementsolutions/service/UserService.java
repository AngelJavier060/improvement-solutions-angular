package com.improvementsolutions.service;

import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserSession;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
      private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.improvementsolutions.storage.StorageService fileStorageService;

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
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Usuario no encontrado");
        }
        
        // Eliminar todas las sesiones del usuario primero para evitar foreign key constraint
        List<UserSession> userSessions = userSessionRepository.findByUserId(id);
        if (!userSessions.isEmpty()) {
            userSessionRepository.deleteAll(userSessions);
            log.info("Eliminadas {} sesiones del usuario con ID: {}", userSessions.size(), id);
        }
        
        // Ahora podemos eliminar el usuario de forma segura
        userRepository.deleteById(id);
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
        
        if (userDetails.getEmail() != null && !user.getEmail().equals(userDetails.getEmail()) && 
                userRepository.existsByEmail(userDetails.getEmail())) {
            throw new RuntimeException("Email ya está en uso");
        }
        
        if (userDetails.getUsername() != null && 
                !user.getUsername().equals(userDetails.getUsername()) && 
                userRepository.existsByUsername(userDetails.getUsername())) {
            throw new RuntimeException("Nombre de usuario ya está en uso");
        }
        
        if (userDetails.getName() != null) {
            user.setName(userDetails.getName());
        }
        
        if (userDetails.getEmail() != null) {
            user.setEmail(userDetails.getEmail());
        }
        
        if (userDetails.getUsername() != null) {
            user.setUsername(userDetails.getUsername());
        }
        
        if (userDetails.getPhone() != null) {
            user.setPhone(userDetails.getPhone());
        }
        
        if (userDetails.getActive() != null) {
            user.setActive(userDetails.getActive());
        }
        
        // Solo actualiza la contraseña si se proporciona una nueva
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
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
        
        // Alternar estado activo
        user.setActive(!user.getActive());
        return userRepository.save(user);
    }
    
    public void updateLastLogin(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }
}
