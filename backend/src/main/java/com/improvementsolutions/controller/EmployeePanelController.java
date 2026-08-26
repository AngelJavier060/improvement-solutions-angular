package com.improvementsolutions.controller;

import com.improvementsolutions.dto.EmployeeCourseResponse;
import com.improvementsolutions.dto.EmployeeDocumentResponse;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.service.BusinessEmployeeCardService;
import com.improvementsolutions.service.BusinessEmployeeCourseService;
import com.improvementsolutions.service.BusinessEmployeeDocumentService;
import com.improvementsolutions.service.UserService;
import com.improvementsolutions.storage.StorageException;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Portal del trabajador (Fase D): solo lectura de su propia información.
 * No permite crear/editar/eliminar documentación.
 */
@RestController
@RequestMapping("/api/employee-panel")
@RequiredArgsConstructor
@Slf4j
public class EmployeePanelController {

    private static final int DAYS_POR_VENCER = 30;

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final UserService userService;
    private final BusinessEmployeeDocumentService documentService;
    private final BusinessEmployeeCourseService courseService;
    private final BusinessEmployeeCardService cardService;
    private final StorageService storageService;

    @GetMapping("/my-profile")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        try {
            List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
            BusinessEmployee be = records.get(0);

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
            profile.put("businesses", mapBusinesses(records));

            return ResponseEntity.ok(profile);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-documents")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyDocuments(Authentication authentication) {
        try {
            List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
            List<Map<String, Object>> docs = new ArrayList<>();
            for (BusinessEmployee be : records) {
                String bizName = be.getBusiness() != null ? be.getBusiness().getName() : null;
                Long bizId = be.getBusiness() != null ? be.getBusiness().getId() : null;
                for (EmployeeDocumentResponse d : documentService.getByBusinessEmployeeId(be.getId(), false)) {
                    Map<String, Object> m = mapDocument(d);
                    m.put("businessId", bizId);
                    m.put("businessName", bizName);
                    docs.add(m);
                }
            }
            return ResponseEntity.ok(docs);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-courses")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyCourses(Authentication authentication) {
        try {
            List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
            List<Map<String, Object>> courses = new ArrayList<>();
            for (BusinessEmployee be : records) {
                String bizName = be.getBusiness() != null ? be.getBusiness().getName() : null;
                Long bizId = be.getBusiness() != null ? be.getBusiness().getId() : null;
                for (EmployeeCourseResponse c : courseService.getByBusinessEmployeeId(be.getId(), false)) {
                    Map<String, Object> m = mapCourse(c);
                    m.put("businessId", bizId);
                    m.put("businessName", bizName);
                    courses.add(m);
                }
            }
            return ResponseEntity.ok(courses);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-cards")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyCards(Authentication authentication) {
        try {
            List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
            List<Map<String, Object>> cards = new ArrayList<>();
            for (BusinessEmployee be : records) {
                String bizName = be.getBusiness() != null ? be.getBusiness().getName() : null;
                Long bizId = be.getBusiness() != null ? be.getBusiness().getId() : null;
                for (var c : cardService.getByBusinessEmployeeId(be.getId())) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.getId());
                    m.put("name", c.getCard() != null ? c.getCard().getName() : "Tarjeta");
                    m.put("cardNumber", c.getCard_number());
                    m.put("issueDate", c.getIssue_date());
                    m.put("expirationDate", c.getExpiry_date());
                    m.put("status", computeStatus(c.getExpiry_date()));
                    m.put("files", c.getFiles());
                    m.put("businessId", bizId);
                    m.put("businessName", bizName);
                    cards.add(m);
                }
            }
            return ResponseEntity.ok(cards);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-dashboard")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyDashboard(Authentication authentication) {
        try {
            List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
            BusinessEmployee primary = records.get(0);

            List<EmployeeDocumentResponse> docs = new ArrayList<>();
            List<EmployeeCourseResponse> courses = new ArrayList<>();
            for (BusinessEmployee be : records) {
                docs.addAll(documentService.getByBusinessEmployeeId(be.getId(), false));
                courses.addAll(courseService.getByBusinessEmployeeId(be.getId(), false));
            }

            int vigentes = 0;
            int porVencer = 0;
            int vencidos = 0;
            List<Map<String, Object>> alerts = new ArrayList<>();

            for (EmployeeDocumentResponse d : docs) {
                String status = computeStatus(d.getEnd_date());
                switch (status) {
                    case "VIGENTE" -> vigentes++;
                    case "POR_VENCER" -> {
                        porVencer++;
                        alerts.add(alert("POR_VENCER",
                                "Documento por vencer: " + typeName(d) +
                                        (d.getEnd_date() != null ? " (" + d.getEnd_date() + ")" : "")));
                    }
                    case "VENCIDO" -> {
                        vencidos++;
                        alerts.add(alert("VENCIDO",
                                "Documento vencido: " + typeName(d) +
                                        (d.getEnd_date() != null ? " (" + d.getEnd_date() + ")" : "")));
                    }
                    default -> { }
                }
            }

            int coursesCompleted = 0;
            int coursesPending = 0;
            for (EmployeeCourseResponse c : courses) {
                String status = computeStatus(c.getExpiry_date());
                if ("VENCIDO".equals(status)) {
                    coursesPending++;
                    alerts.add(alert("VENCIDO",
                            "Curso/certificación vencida: " + courseName(c)));
                } else if ("POR_VENCER".equals(status)) {
                    coursesCompleted++;
                    alerts.add(alert("POR_VENCER",
                            "Curso/certificación por vencer: " + courseName(c)));
                } else {
                    coursesCompleted++;
                }
            }

            Map<String, Object> dashboard = new LinkedHashMap<>();
            dashboard.put("employeeName", primary.getFullName());
            dashboard.put("position", primary.getPosition());
            dashboard.put("businessName", primary.getBusiness() != null ? primary.getBusiness().getName() : null);
            dashboard.put("businesses", mapBusinesses(records));
            dashboard.put("cedula", primary.getCedula());
            dashboard.put("active", primary.getActive());
            dashboard.put("totalDocuments", docs.size());
            dashboard.put("documentsVigentes", vigentes);
            dashboard.put("documentsPorVencer", porVencer);
            dashboard.put("documentsVencidos", vencidos);
            dashboard.put("totalCourses", courses.size());
            dashboard.put("coursesCompleted", coursesCompleted);
            dashboard.put("coursesPending", coursesPending);
            dashboard.put("alerts", alerts);

            return ResponseEntity.ok(dashboard);
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Descarga segura: solo archivos de documentos/cursos/tarjetas del empleado autenticado
     * en cualquiera de sus empresas.
     */
    @GetMapping("/my-file")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadMyFile(
            @RequestParam("path") String path,
            Authentication authentication) {
        if (path == null || path.isBlank() || path.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta inválida");
        }
        List<BusinessEmployee> records = getAuthenticatedEmployees(authentication);
        boolean owns = false;
        for (BusinessEmployee be : records) {
            if (ownsFilePath(be.getId(), path)) {
                owns = true;
                break;
            }
        }
        if (!owns) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a este archivo");
        }
        try {
            Resource file = storageService.loadAsResource(path);
            String filename = file.getFilename() != null ? file.getFilename() : "documento";
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            String lower = filename.toLowerCase(Locale.ROOT);
            if (lower.endsWith(".pdf")) {
                mediaType = MediaType.APPLICATION_PDF;
            } else if (lower.endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .contentType(mediaType)
                    .body(file);
        } catch (StorageException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado");
        }
    }

    private boolean ownsFilePath(Long businessEmployeeId, String path) {
        String normalized = path.startsWith("/") ? path.substring(1) : path;
        List<EmployeeDocumentResponse> docs = documentService.getByBusinessEmployeeId(businessEmployeeId, false);
        for (EmployeeDocumentResponse d : docs) {
            if (d.getFiles() != null) {
                for (var f : d.getFiles()) {
                    if (fileUrlMatches(f.getFile(), normalized)) return true;
                }
            }
        }
        List<EmployeeCourseResponse> courses = courseService.getByBusinessEmployeeId(businessEmployeeId, false);
        for (EmployeeCourseResponse c : courses) {
            if (c.getFiles() != null) {
                for (var f : c.getFiles()) {
                    if (fileUrlMatches(f.getFile(), normalized)) return true;
                }
            }
        }
        var cards = cardService.getByBusinessEmployeeId(businessEmployeeId);
        for (var c : cards) {
            if (c.getFiles() != null) {
                for (var f : c.getFiles()) {
                    if (fileUrlMatches(f.getFile(), normalized)) return true;
                }
            }
        }
        return false;
    }

    private boolean fileUrlMatches(String publicUrl, String path) {
        if (publicUrl == null) return false;
        // publicUrl: /api/files/download/employee-docs/uuid.pdf  or /api/files/uuid.pdf
        String rel = publicUrl;
        if (rel.contains("/api/files/download/")) {
            rel = rel.substring(rel.indexOf("/api/files/download/") + "/api/files/download/".length());
        } else if (rel.contains("/api/files/")) {
            rel = rel.substring(rel.indexOf("/api/files/") + "/api/files/".length());
        }
        return path.equals(rel) || path.endsWith(rel) || rel.endsWith(path);
    }

    private Map<String, Object> mapDocument(EmployeeDocumentResponse d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("name", typeName(d));
        m.put("type", typeName(d));
        m.put("description", d.getDescription());
        m.put("issueDate", d.getStart_date());
        m.put("expirationDate", d.getEnd_date());
        m.put("status", computeStatus(d.getEnd_date()));
        m.put("files", d.getFiles());
        return m;
    }

    private Map<String, Object> mapCourse(EmployeeCourseResponse c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", courseName(c));
        m.put("date", c.getIssue_date());
        m.put("expirationDate", c.getExpiry_date());
        m.put("duration", c.getHours() != null ? c.getHours() + " h" : null);
        m.put("score", c.getScore());
        String status = computeStatus(c.getExpiry_date());
        m.put("status", status);
        m.put("completed", !"VENCIDO".equals(status));
        m.put("files", c.getFiles());
        return m;
    }

    private String typeName(EmployeeDocumentResponse d) {
        return d.getType_document() != null ? d.getType_document().getName() : "Documento";
    }

    private String courseName(EmployeeCourseResponse c) {
        return c.getCourse() != null ? c.getCourse().getName() : "Curso";
    }

    private Map<String, Object> alert(String type, String message) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("type", type);
        a.put("message", message);
        return a;
    }

    private String computeStatus(LocalDate endDate) {
        if (endDate == null) {
            return "VIGENTE";
        }
        LocalDate today = LocalDate.now();
        if (endDate.isBefore(today)) {
            return "VENCIDO";
        }
        long days = ChronoUnit.DAYS.between(today, endDate);
        if (days <= DAYS_POR_VENCER) {
            return "POR_VENCER";
        }
        return "VIGENTE";
    }

    private BusinessEmployee getAuthenticatedEmployee(Authentication authentication) {
        return getAuthenticatedEmployees(authentication).get(0);
    }

    private List<BusinessEmployee> getAuthenticatedEmployees(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        String username = authentication.getName();
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        List<BusinessEmployee> byUser = businessEmployeeRepository.findAllByUserId(user.getId());
        if (byUser == null || byUser.isEmpty()) {
            byUser = businessEmployeeRepository.findByCedula(username);
        }
        if (byUser == null || byUser.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No se encontró el registro de empleado vinculado a esta cuenta");
        }

        List<BusinessEmployee> active = byUser.stream()
                .filter(this::isEmployeeActive)
                .collect(java.util.stream.Collectors.toList());
        if (active.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Trabajador inactivo. No tiene acceso al portal de empleado.");
        }
        return active;
    }

    private boolean isEmployeeActive(BusinessEmployee be) {
        if (be == null) return false;
        if (Boolean.FALSE.equals(be.getActive())) return false;
        String status = be.getStatus();
        if (status != null && "INACTIVO".equalsIgnoreCase(status.trim())) return false;
        return be.getActive() == null || Boolean.TRUE.equals(be.getActive())
                || (status != null && "ACTIVO".equalsIgnoreCase(status.trim()));
    }

    private List<Map<String, Object>> mapBusinesses(List<BusinessEmployee> records) {
        List<Map<String, Object>> list = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (BusinessEmployee be : records) {
            if (be.getBusiness() == null || be.getBusiness().getId() == null) continue;
            if (!seen.add(be.getBusiness().getId())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", be.getBusiness().getId());
            m.put("name", be.getBusiness().getName());
            m.put("ruc", be.getBusiness().getRuc());
            list.add(m);
        }
        return list;
    }
}
