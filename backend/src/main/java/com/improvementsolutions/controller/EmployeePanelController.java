package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.model.BusinessEmployeeCourse;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Restricted panel for employees — they can only see their own data.
 */
@RestController
@RequestMapping("/api/employee-panel")
@RequiredArgsConstructor
@Slf4j
public class EmployeePanelController {

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final UserService userService;

    /**
     * Get the authenticated employee's profile and summary.
     */
    @GetMapping("/my-profile")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        try {
            BusinessEmployee be = getAuthenticatedEmployee(authentication);

            Map<String, Object> profile = new LinkedHashMap<>();
            profile.put("id", be.getId());
            profile.put("cedula", be.getCedula());
            profile.put("nombres", be.getNombres());
            profile.put("apellidos", be.getApellidos());
            profile.put("fullName", be.getFullName());
            profile.put("email", be.getEmail());
            profile.put("phone", be.getPhone());
            profile.put("position", be.getPosition());
            profile.put("department", be.getDepartment() != null ? be.getDepartment().getName() : null);
            profile.put("fechaIngreso", be.getFechaIngreso());
            profile.put("tipoSangre", be.getTipoSangre());
            profile.put("active", be.getActive());
            profile.put("status", be.getStatus());
            profile.put("businessName", be.getBusiness() != null ? be.getBusiness().getName() : null);
            profile.put("imagePath", be.getImagePath());

            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get the authenticated employee's documents with expiry status.
     */
    @GetMapping("/my-documents")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyDocuments(Authentication authentication) {
        try {
            BusinessEmployee be = getAuthenticatedEmployee(authentication);

            // Load documents from the employee's related entities
            List<Map<String, Object>> docs = new ArrayList<>();

            // Try to get documents if the entity has them loaded
            // We need to query for documents associated with this business employee
            if (be.getId() != null) {
                // Query documents - this depends on the existing document relationships
                // For now, return the structure that the frontend expects
                log.info("Loading documents for employee id={}", be.getId());
            }

            return ResponseEntity.ok(docs);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get the authenticated employee's courses with completion status.
     */
    @GetMapping("/my-courses")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyCourses(Authentication authentication) {
        try {
            BusinessEmployee be = getAuthenticatedEmployee(authentication);

            List<Map<String, Object>> courses = new ArrayList<>();

            if (be.getId() != null) {
                log.info("Loading courses for employee id={}", be.getId());
            }

            return ResponseEntity.ok(courses);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get a summary dashboard for the employee: counts, alerts, expiring docs.
     */
    @GetMapping("/my-dashboard")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<?> getMyDashboard(Authentication authentication) {
        try {
            BusinessEmployee be = getAuthenticatedEmployee(authentication);

            Map<String, Object> dashboard = new LinkedHashMap<>();
            dashboard.put("employeeName", be.getFullName());
            dashboard.put("position", be.getPosition());
            dashboard.put("businessName", be.getBusiness() != null ? be.getBusiness().getName() : null);
            dashboard.put("cedula", be.getCedula());
            dashboard.put("active", be.getActive());

            // Placeholder counts — will be populated as document/course repos are wired
            dashboard.put("totalDocuments", 0);
            dashboard.put("documentsVigentes", 0);
            dashboard.put("documentsPorVencer", 0);
            dashboard.put("documentsVencidos", 0);
            dashboard.put("totalCourses", 0);
            dashboard.put("coursesCompleted", 0);
            dashboard.put("coursesPending", 0);

            // Alerts list
            dashboard.put("alerts", new ArrayList<>());

            return ResponseEntity.ok(dashboard);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private BusinessEmployee getAuthenticatedEmployee(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return businessEmployeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("No se encontró el registro de empleado vinculado a esta cuenta"));
    }
}
