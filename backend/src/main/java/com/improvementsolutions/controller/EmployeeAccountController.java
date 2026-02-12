package com.improvementsolutions.controller;

import com.improvementsolutions.dto.UserResponseDto;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.service.BusinessService;
import com.improvementsolutions.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Controller for creating and managing user accounts for employees.
 * Allows company admins to create login credentials for their workers.
 */
@RestController
@RequestMapping("/api/employee-accounts")
@RequiredArgsConstructor
@Slf4j
public class EmployeeAccountController {

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final UserService userService;
    private final BusinessService businessService;
    private final RoleRepository roleRepository;

    /**
     * Creates a user account for an employee using their cedula as username.
     * The employee gets ROLE_EMPLOYEE and is linked to the business.
     */
    @PostMapping("/{businessEmployeeId}/create-account")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createEmployeeAccount(
            @PathVariable Long businessEmployeeId,
            @RequestBody Map<String, String> payload) {
        try {
            BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                    .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

            if (be.getUser() != null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Este empleado ya tiene una cuenta de usuario"));
            }

            String username = payload.getOrDefault("username", be.getCedula());
            String password = payload.get("password");
            String email = payload.getOrDefault("email", be.getEmail());

            if (password == null || password.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "La contraseña es obligatoria"));
            }
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "El email es obligatorio"));
            }

            // Create user with ROLE_EMPLOYEE
            User user = new User();
            user.setUsername(username);
            user.setPassword(password); // will be encoded by UserService.create()
            user.setEmail(email);
            user.setName(be.getFullName());
            user.setPhone(be.getPhone());
            user.setActive(true);

            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("ROLE_EMPLOYEE").ifPresent(roles::add);
            user.setRoles(roles);

            // Associate with business
            if (be.getBusiness() != null) {
                Set<Business> businesses = new HashSet<>();
                businesses.add(be.getBusiness());
                user.setBusinesses(businesses);
            }

            User saved = userService.create(user);

            // Link user to employee record
            be.setUser(saved);
            businessEmployeeRepository.save(be);

            log.info("Cuenta de empleado creada: username={}, employeeId={}", username, businessEmployeeId);
            return ResponseEntity.status(HttpStatus.CREATED).body(new UserResponseDto(saved));

        } catch (RuntimeException e) {
            log.error("Error al crear cuenta de empleado: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Check if an employee already has a user account.
     */
    @GetMapping("/{businessEmployeeId}/has-account")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> hasAccount(@PathVariable Long businessEmployeeId) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        boolean hasAccount = be.getUser() != null;
        Map<String, Object> result = Map.of(
                "hasAccount", hasAccount,
                "username", hasAccount ? be.getUser().getUsername() : "",
                "userId", hasAccount ? be.getUser().getId() : 0
        );
        return ResponseEntity.ok(result);
    }

    /**
     * List all employees of a business with their account status.
     */
    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getEmployeesWithAccountStatus(@PathVariable Long businessId) {
        var employees = businessEmployeeRepository.findByBusinessId(businessId);
        var result = employees.stream().map(be -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", be.getId());
            map.put("cedula", be.getCedula());
            map.put("nombres", be.getNombres());
            map.put("apellidos", be.getApellidos());
            map.put("fullName", be.getFullName());
            map.put("email", be.getEmail());
            map.put("phone", be.getPhone());
            map.put("position", be.getPosition());
            map.put("active", be.getActive());
            map.put("status", be.getStatus());
            map.put("hasAccount", be.getUser() != null);
            map.put("username", be.getUser() != null ? be.getUser().getUsername() : null);
            map.put("userId", be.getUser() != null ? be.getUser().getId() : null);
            return map;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
