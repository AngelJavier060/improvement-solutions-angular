package com.improvementsolutions.controller;

import com.improvementsolutions.dto.SuccessResponse;
import com.improvementsolutions.dto.ErrorResponse;
import com.improvementsolutions.dto.user.UserDto;
import com.improvementsolutions.dto.user.UserUpdateDto;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.service.FileStorageService;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.service.UserAdminAuthorizationService;
import com.improvementsolutions.service.UserService;
import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Controlador para la gestión administrativa de usuarios.
 * Fase B: scope por empresa + reglas de roles (sin tocar Superadmin).
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class UserAdminController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserAdminController.class);    
    @Autowired
    private UserService userService;
    
    @Autowired
    private FileStorageService fileStorageService;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserAdminAuthorizationService authz;

    @Autowired
    private com.improvementsolutions.service.UserOperationalCapabilityService capabilityService;

    /**
     * Matriz de capacidades operativas de una empresa (para habilitar acciones por usuario).
     */
    @GetMapping("/business/{businessId}/capabilities")
    public ResponseEntity<?> getCapabilitiesByBusiness(@PathVariable Long businessId,
                                                       Authentication authentication) {
        try {
            authz.assertCanAccessBusiness(authentication, businessId);
            List<User> users = userService.findByBusinessIdWithRoles(businessId);
            users = authz.filterVisibleUsers(authentication, users);
            // Solo perfiles de operación intranet (no trabajadores / no super)
            users = users.stream()
                    .filter(u -> !UserAdminAuthorizationService.hasRole(u, UserAdminAuthorizationService.ROLE_EMPLOYEE))
                    .filter(u -> !UserAdminAuthorizationService.hasRole(u, UserAdminAuthorizationService.ROLE_SUPER_ADMIN))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(capabilityService.resolveForUsers(users, authentication));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }

    @GetMapping("/{id}/capabilities")
    public ResponseEntity<?> getUserCapabilities(@PathVariable Long id, Authentication authentication) {
        try {
            User user = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanViewUser(authentication, user);
            return ResponseEntity.ok(capabilityService.resolveForUser(user, authentication));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }

    @PutMapping("/{id}/capabilities")
    public ResponseEntity<?> updateUserCapabilities(@PathVariable Long id,
                                                    @RequestBody com.improvementsolutions.dto.user.UserOperationalCapabilityDto body,
                                                    Authentication authentication) {
        try {
            User user = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanMutateUser(authentication, user);
            return ResponseEntity.ok(capabilityService.updateCapabilities(id, body, authentication));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }

    /**
     * Roles asignables desde Gestión de Usuarios (Supervisor, Gestor, Admin empresa).
     */
    @GetMapping("/roles")
    public ResponseEntity<?> getAssignableRoles() {
        List<Map<String, Object>> roles = roleRepository.findAll().stream()
                .filter(r -> {
                    String n = r.getName();
                    return UserAdminAuthorizationService.ROLE_USER.equals(n)
                            || UserAdminAuthorizationService.ROLE_MANAGER.equals(n)
                            || UserAdminAuthorizationService.ROLE_ADMIN.equals(n);
                })
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("name", r.getName());
                    m.put("description", r.getDescription());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }
    
    /**
     * Lista usuarios visibles para el caller.
     * Superadmin: todos. Admin empresa: solo usuarios de su(s) empresa(s).
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        logger.info("Obteniendo lista de usuarios");
        try {
            List<User> users;
            if (authz.isCompanyAdmin(authentication)) {
                Set<Long> businessIds = authz.companyBusinessIds(authentication);
                Map<Long, User> byId = new LinkedHashMap<>();
                for (Long businessId : businessIds) {
                    for (User u : userService.findByBusinessIdWithRoles(businessId)) {
                        if (u.getId() != null) {
                            byId.putIfAbsent(u.getId(), u);
                        }
                    }
                }
                users = new ArrayList<>(byId.values());
                users = authz.filterVisibleUsers(authentication, users);
            } else {
                users = userService.findAllWithRoles();
            }
            List<UserDto> usersDto = users.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(usersDto);
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }
    
    /**
     * Usuarios de una empresa (Admin empresa solo su businessId).
     */
    @GetMapping("/business/{businessId}")
    public ResponseEntity<?> getUsersByBusiness(@PathVariable Long businessId,
                                                Authentication authentication) {
        logger.info("Obteniendo usuarios de la empresa con ID: {}", businessId);
        try {
            authz.assertCanAccessBusiness(authentication, businessId);
            List<User> users = userService.findByBusinessIdWithRoles(businessId);
            users = authz.filterVisibleUsers(authentication, users);
            List<UserDto> usersDto = users.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(usersDto);
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id, Authentication authentication) {
        logger.info("Obteniendo usuario con ID: {}", id);
        try {
            User user = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanViewUser(authentication, user);
            return ResponseEntity.ok(convertToDto(user));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @Valid @RequestBody UserUpdateDto userUpdateDto,
                                        Authentication authentication) {
        logger.info("Actualizando usuario con ID: {}", id);
        try {
            User target = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanMutateUser(authentication, target);
            authz.assertRoleChangeAllowed(authentication, target, userUpdateDto.getRoleIds());

            // Trabajador: no permitir cambio de roles aunque el cliente envíe roleIds
            if (UserAdminAuthorizationService.hasRole(target, UserAdminAuthorizationService.ROLE_EMPLOYEE)) {
                userUpdateDto.setRoleIds(null);
            }

            // Roles ya validados en assertRoleChangeAllowed (Admin empresa: Supervisor o Gestor)

            User updatedUser = userService.updateAdmin(id, userUpdateDto);
            return ResponseEntity.ok(convertToDto(updatedUser));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        } catch (Exception e) {
            logger.error("Error al actualizar usuario: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Crea usuario.
     * Solo SUPER_ADMIN puede crear ROLE_ADMIN.
     * ADMIN solo crea ROLE_USER.
     * Nunca se asigna ROLE_SUPER_ADMIN ni ROLE_EMPLOYEE aquí.
     */
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody UserUpdateDto userCreateDto,
                                        Authentication authentication) {
        logger.info("Creando nuevo usuario");
        try {
            if (userCreateDto.getPassword() == null || userCreateDto.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("La contraseña es obligatoria para crear un usuario");
            }

            Set<Role> roles = authz.resolveRolesForCreate(authentication, userCreateDto.getRoleIds());
            
            User newUser = new User();
            newUser.setUsername(userCreateDto.getUsername());
            newUser.setEmail(userCreateDto.getEmail());
            newUser.setName(userCreateDto.getName());
            newUser.setPhone(userCreateDto.getPhone());
            newUser.setPassword(userCreateDto.getPassword());
            newUser.setActive(userCreateDto.getActive() != null ? userCreateDto.getActive() : true);
            newUser.setRoles(roles);
            
            User createdUser = userService.create(newUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdUser));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        } catch (Exception e) {
            logger.error("Error al crear usuario: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id,
                                        @RequestParam(name = "force", required = false, defaultValue = "false") boolean force,
                                        Authentication authentication) {
        logger.info("Eliminando usuario con ID: {} (force={})", id, force);
        try {
            User userToDelete = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

            authz.assertCanMutateUser(authentication, userToDelete);

            // Solo Super puede eliminar Admin de empresa (ya bloqueado para company admin en assertCanMutate)
            if (UserAdminAuthorizationService.hasRole(userToDelete, UserAdminAuthorizationService.ROLE_ADMIN)
                    && !authz.isSuperAdmin(authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse(
                                "Solo los Super Administradores pueden eliminar otros administradores",
                                "FORBIDDEN",
                                403));
            }
            
            java.util.Map<String, Object> report = userService.deleteWithReport(id, force);
            String msg = force ? "Usuario eliminado con limpieza forzada" : "Usuario eliminado correctamente";
            return ResponseEntity.ok(new SuccessResponse(msg, report));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        } catch (DataIntegrityViolationException dive) {
            logger.error("Violación de integridad al eliminar usuario {}: {}", id, dive.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(
                            "No se puede eliminar el usuario porque tiene relaciones activas (roles/asociaciones). Intente desasociar primero o use ?force=true.",
                            "CONSTRAINT_VIOLATION",
                            409));
        } catch (Exception e) {
            logger.error("Error al eliminar usuario: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(
                            "Error al eliminar el usuario",
                            "BAD_REQUEST",
                            400));
        }
    }

    @PostMapping(value = "/{id}/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProfilePicture(@PathVariable Long id,
                                                  @RequestParam("file") MultipartFile file,
                                                  Authentication authentication) {
        logger.info("Actualizando foto de perfil para usuario ID: {}", id);
        try {
            User target = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanMutateUser(authentication, target);
            String profilePicturePath = userService.updateProfilePicture(id, file);
            return ResponseEntity.ok().body(new SuccessResponse("Foto de perfil actualizada correctamente", profilePicturePath));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        } catch (Exception e) {
            logger.error("Error al actualizar foto de perfil: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new SuccessResponse("Error al actualizar foto de perfil: " + e.getMessage(), 500));
        }
    }
    
    @PutMapping("/{id}/toggle-active")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long id, Authentication authentication) {
        logger.info("Cambiando estado de activación para usuario ID: {}", id);
        try {
            User target = userRepository.findByIdWithRoles(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            authz.assertCanMutateUser(authentication, target);

            User user = userService.toggleUserActive(id);
            return ResponseEntity.ok(convertToDto(user));
        } catch (ResponseStatusException rse) {
            return toError(rse);
        } catch (IllegalStateException ise) {
            logger.warn("Regla de negocio impide cambiar estado para usuario {}: {}", id, ise.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(ise.getMessage(), "BUSINESS_RULE", 409));
        } catch (java.util.NoSuchElementException | org.springframework.dao.EmptyResultDataAccessException notFound) {
            logger.error("Usuario no encontrado al cambiar estado: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("Usuario no encontrado", "NOT_FOUND", 404));
        } catch (Exception e) {
            logger.error("Error al cambiar estado de activación: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Error al cambiar estado del usuario", "BAD_REQUEST", 400));
        }
    }
    
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

    private ResponseEntity<ErrorResponse> toError(ResponseStatusException rse) {
        HttpStatus status = HttpStatus.resolve(rse.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.BAD_REQUEST;
        }
        String reason = rse.getReason() != null ? rse.getReason() : status.getReasonPhrase();
        return ResponseEntity.status(status)
                .body(new ErrorResponse(reason, status.name(), status.value()));
    }
}
