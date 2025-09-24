package com.improvementsolutions.controller;

import com.improvementsolutions.dto.SuccessResponse;
import com.improvementsolutions.dto.user.UserDto;
import com.improvementsolutions.dto.user.UserUpdateDto;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.service.FileStorageService;
import com.improvementsolutions.service.UserService;
import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Controlador para la gestión administrativa de usuarios
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class UserAdminController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserAdminController.class);    
    @Autowired
    private UserService userService;
    
    @Autowired
    private FileStorageService fileStorageService;
    
    @Autowired
    private RoleRepository roleRepository;
    
    /**
     * Obtiene una lista de todos los usuarios
     */
    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        logger.info("Obteniendo lista de usuarios");
        List<User> users = userService.findAllWithRoles();
        List<UserDto> usersDto = users.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(usersDto);
    }
    
    /**
     * Obtiene un usuario por su ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        logger.info("Obteniendo usuario con ID: {}", id);
        return userService.findById(id)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
      /**
     * Actualiza un usuario existente
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateDto userUpdateDto) {
        logger.info("Actualizando usuario con ID: {}", id);
        try {
            User updatedUser = userService.updateAdmin(id, userUpdateDto);
            return ResponseEntity.ok(convertToDto(updatedUser));
        } catch (Exception e) {
            logger.error("Error al actualizar usuario: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Crea un nuevo usuario
     */
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody UserUpdateDto userCreateDto) {
        logger.info("Creando nuevo usuario");
        try {
            if (userCreateDto.getPassword() == null || userCreateDto.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("La contraseña es obligatoria para crear un usuario");
            }
            
            User newUser = new User();
            newUser.setUsername(userCreateDto.getUsername());
            newUser.setEmail(userCreateDto.getEmail());
            newUser.setName(userCreateDto.getName());
            newUser.setPhone(userCreateDto.getPhone());
            newUser.setPassword(userCreateDto.getPassword());
            newUser.setActive(userCreateDto.getActive() != null ? userCreateDto.getActive() : true);
            
            // Procesar roles si se proporcionan
            if (userCreateDto.getRoleIds() != null && !userCreateDto.getRoleIds().isEmpty()) {
                Set<Role> roles = userCreateDto.getRoleIds().stream()
                        .map(roleId -> roleRepository.findById(roleId)
                                .orElseThrow(() -> new RuntimeException("Rol no encontrado con ID: " + roleId)))
                        .collect(java.util.stream.Collectors.toSet());
                newUser.setRoles(roles);
            }
            
            User createdUser = userService.create(newUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdUser));
        } catch (Exception e) {
            logger.error("Error al crear usuario: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Elimina un usuario
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        logger.info("Eliminando usuario con ID: {}", id);
        try {
            userService.delete(id);
            return ResponseEntity.ok(new SuccessResponse("Usuario eliminado correctamente"));
        } catch (Exception e) {
            logger.error("Error al eliminar usuario: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
      /**
     * Actualiza la foto de perfil de un usuario
     */
    @PostMapping(value = "/{id}/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProfilePicture(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        logger.info("Actualizando foto de perfil para usuario ID: {}", id);
        try {
            String profilePicturePath = userService.updateProfilePicture(id, file);
            return ResponseEntity.ok().body(new SuccessResponse("Foto de perfil actualizada correctamente", profilePicturePath));
        } catch (Exception e) {
            logger.error("Error al actualizar foto de perfil: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new SuccessResponse("Error al actualizar foto de perfil: " + e.getMessage(), 500));
        }
    }
    
    /**
     * Activa o desactiva un usuario
     */
    @PutMapping("/{id}/toggle-active")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long id) {
        logger.info("Cambiando estado de activación para usuario ID: {}", id);
        try {
            User user = userService.toggleUserActive(id);
            return ResponseEntity.ok(convertToDto(user));
        } catch (Exception e) {
            logger.error("Error al cambiar estado de activación: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Convierte una entidad User a DTO
     */
    private UserDto convertToDto(User user) {
        if (user == null) return null;
        
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setPhone(user.getPhone());
        dto.setActive(user.getActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setProfilePicture(user.getProfilePicture());
        
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(Collectors.toSet()));
        }
        
        return dto;
    }
}
