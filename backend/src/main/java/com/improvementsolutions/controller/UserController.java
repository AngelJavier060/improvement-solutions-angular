package com.improvementsolutions.controller;

import com.improvementsolutions.dto.user.CreateUserDto;
import com.improvementsolutions.dto.user.UserResponseDto;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.service.BusinessService;
import com.improvementsolutions.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final BusinessService businessService;
    private final RoleRepository roleRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserDto createUserDto) {
        try {
            // Crear el usuario
            User user = new User();
            user.setName(createUserDto.getName());
            user.setEmail(createUserDto.getEmail());
            user.setPhone(createUserDto.getPhone());
            user.setUsername(createUserDto.getUsername());
            user.setPassword(createUserDto.getPassword());
            user.setActive(true);

            // Asignar roles
            if (createUserDto.getRole_ids() != null && !createUserDto.getRole_ids().isEmpty()) {
                // Asignar roles específicos si se proporcionan
                for (Long roleId : createUserDto.getRole_ids()) {
                    Role role = roleRepository.findById(roleId)
                            .orElseThrow(() -> new RuntimeException("Rol con ID " + roleId + " no encontrado"));
                    user.getRoles().add(role);
                }
            } else {
                // Asignar rol por defecto ROLE_USER si no se especifican roles
                Role defaultRole = roleRepository.findByName("ROLE_USER")
                        .orElseThrow(() -> new RuntimeException("Rol por defecto no encontrado"));
                user.getRoles().add(defaultRole);
            }

            // Asignar empresa si se proporciona business_id
            if (createUserDto.getBusiness_id() != null) {
                Business business = businessService.findById(createUserDto.getBusiness_id())
                        .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
                user.addBusiness(business);
            }

            // Crear el usuario usando el servicio
            User savedUser = userService.create(user);

            // Crear respuesta
            UserResponseDto response = new UserResponseDto();
            response.setId(savedUser.getId());
            response.setName(savedUser.getName());
            response.setEmail(savedUser.getEmail());
            response.setPhone(savedUser.getPhone());
            response.setUsername(savedUser.getUsername());
            response.setBusiness_id(createUserDto.getBusiness_id());
            response.setCreated_at(savedUser.getCreatedAt().toString());
            response.setUpdated_at(savedUser.getUpdatedAt().toString());
            
            // Incluir roles del usuario creado como lista de strings
            List<String> roleNames = savedUser.getRoles().stream()
                    .map(Role::getName)
                    .collect(Collectors.toList());
            response.setRoles(roleNames);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error interno del servidor: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            User user = userService.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            UserResponseDto response = new UserResponseDto();
            response.setId(user.getId());
            response.setName(user.getName());
            response.setEmail(user.getEmail());
            response.setPhone(user.getPhone());
            response.setUsername(user.getUsername());
            response.setCreated_at(user.getCreatedAt().toString());
            response.setUpdated_at(user.getUpdatedAt().toString());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody CreateUserDto updateUserDto) {
        try {
            User userDetails = new User();
            userDetails.setName(updateUserDto.getName());
            userDetails.setEmail(updateUserDto.getEmail());
            userDetails.setPhone(updateUserDto.getPhone());
            userDetails.setUsername(updateUserDto.getUsername());
            if (updateUserDto.getPassword() != null && !updateUserDto.getPassword().isEmpty()) {
                userDetails.setPassword(updateUserDto.getPassword());
            }

            User updatedUser = userService.update(id, userDetails);

            UserResponseDto response = new UserResponseDto();
            response.setId(updatedUser.getId());
            response.setName(updatedUser.getName());
            response.setEmail(updatedUser.getEmail());
            response.setPhone(updatedUser.getPhone());
            response.setUsername(updatedUser.getUsername());
            response.setCreated_at(updatedUser.getCreatedAt().toString());
            response.setUpdated_at(updatedUser.getUpdatedAt().toString());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.delete(id);
            return ResponseEntity.ok(new SuccessResponse("Usuario eliminado exitosamente"));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        List<User> users = userService.findAll();
        List<UserResponseDto> response = users.stream()
                .map(user -> {
                    UserResponseDto dto = new UserResponseDto();
                    dto.setId(user.getId());
                    dto.setName(user.getName());
                    dto.setEmail(user.getEmail());
                    dto.setPhone(user.getPhone());
                    dto.setUsername(user.getUsername());
                    dto.setCreated_at(user.getCreatedAt().toString());
                    dto.setUpdated_at(user.getUpdatedAt().toString());
                    return dto;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<RoleDto>> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        List<RoleDto> response = roles.stream()
                .map(role -> {
                    RoleDto dto = new RoleDto();
                    dto.setId(role.getId());
                    dto.setName(role.getName());
                    dto.setDescription(role.getDescription());
                    return dto;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Clases de respuesta internas
    public static class RoleDto {
        private Long id;
        private String name;
        private String description;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    // Clases de respuesta internas
    public static class ErrorResponse {
        private String message;
        private String timestamp;

        public ErrorResponse(String message) {
            this.message = message;
            this.timestamp = LocalDateTime.now().toString();
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    public static class SuccessResponse {
        private String message;
        private String timestamp;

        public SuccessResponse(String message) {
            this.message = message;
            this.timestamp = LocalDateTime.now().toString();
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }
}
