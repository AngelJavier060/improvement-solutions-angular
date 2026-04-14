package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * REST API para Control de Asistencia - Módulo Talento Humano.
 * Todos los endpoints requieren businessId para garantizar aislamiento multiempresa.
 * Base: /api/attendance/{businessId}
 */
@RestController
@RequestMapping("/api/attendance/{businessId}")
@RequiredArgsConstructor
@Slf4j
public class AttendanceController {

    private final AttendanceService attendanceService;

    @Value("${app.storage.location:uploads}")
    private String storageBaseDir;

    // ─────────────────── KPIs ───────────────────

    @GetMapping("/kpis")
    public ResponseEntity<?> getKpis(
            @PathVariable Long businessId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            return ResponseEntity.ok(attendanceService.getMonthlyKpis(businessId, year, month));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Diagnóstico: qué registros cuenta el consolidado de HHTT (solo para debug, sin auth en esta ruta no aplica) */
    @GetMapping("/consolidado-hhtt/debug")
    public ResponseEntity<?> debugConsolidadoHhtt(
            @PathVariable Long businessId,
            @RequestParam int year) {
        try {
            return ResponseEntity.ok(attendanceService.debugConsolidadoRecords(businessId, year));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** Consolidado anual HH (planilla mensual + horas extra) para indicadores HSSE */
    @GetMapping("/consolidado-hhtt")
    public ResponseEntity<?> getConsolidadoHhtt(
            @PathVariable Long businessId,
            @RequestParam int year,
            @RequestParam(required = false) Double standardHoursPerDay) {
        try {
            double h = standardHoursPerDay != null ? standardHoursPerDay : 8.0;
            return ResponseEntity.ok(attendanceService.getConsolidadoHhttSummary(businessId, year, h));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Índices de seguridad (IF, TRIF, IG, TR) basados en HHTT e incidentes registrados */
    @GetMapping("/safety-indices")
    public ResponseEntity<?> getSafetyIndices(
            @PathVariable Long businessId,
            @RequestParam int year) {
        try {
            return ResponseEntity.ok(attendanceService.getSafetyIndicesSummary(businessId, year));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/permissions/{id}/pdf")
    public ResponseEntity<?> getPermissionSignedPdf(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            java.util.Optional<EmployeePermission> opt = attendanceService.getPermissionsByBusiness(businessId, null, null)
                    .stream().filter(p -> p.getId().equals(id)).findFirst();
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            String path = opt.get().getSignedPdfPath();
            if (path == null || path.isBlank()) return ResponseEntity.notFound().build();
            java.nio.file.Path p = java.nio.file.Paths.get(path);
            if (!java.nio.file.Files.exists(p)) return ResponseEntity.notFound().build();
            Resource res = new FileSystemResource(p.toFile());
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/employees/{employeeId}/day-type")
    public ResponseEntity<?> getEmployeeDayType(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestParam("date") String dateStr) {
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            String type = attendanceService.computeDayType(businessId, employeeId, date);
            return ResponseEntity.ok(java.util.Map.of(
                    "employeeId", employeeId,
                    "date", date.toString(),
                    "dayType", type
            ));
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Fecha inválida"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── DATE CONFLICT CHECK ───────────────────

    @GetMapping("/employees/{employeeId}/date-conflict")
    public ResponseEntity<?> checkDateConflict(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestParam("date") String dateStr) {
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            attendanceService.requireEmployee(businessId, employeeId);
            // Check permissions
            List<com.improvementsolutions.model.EmployeePermission> perms =
                attendanceService.findPermissionConflicts(employeeId, date);
            if (!perms.isEmpty()) {
                com.improvementsolutions.model.EmployeePermission p = perms.get(0);
                return ResponseEntity.ok(Map.of(
                    "conflict", true,
                    "type", "PERMISO",
                    "detail", "Ya existe un PERMISO (" + p.getPermissionType() + ") registrado para el " + p.getPermissionDate() + " — estado: " + p.getStatus()
                ));
            }
            // Check vacations
            List<com.improvementsolutions.model.EmployeeVacation> vacs =
                attendanceService.findVacationConflicts(employeeId, date);
            if (!vacs.isEmpty()) {
                com.improvementsolutions.model.EmployeeVacation v = vacs.get(0);
                return ResponseEntity.ok(Map.of(
                    "conflict", true,
                    "type", "VACACIONES",
                    "detail", "Ya existen VACACIONES registradas del " + v.getStartDate() + " al " + v.getEndDate() + " — estado: " + v.getStatus()
                ));
            }
            // Check overtime
            List<com.improvementsolutions.model.EmployeeOvertime> ots =
                attendanceService.findOvertimeConflicts(employeeId, date);
            if (!ots.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "conflict", true,
                    "type", "HORAS EXTRA",
                    "detail", "Ya existen HORAS EXTRA registradas para el " + date
                ));
            }
            return ResponseEntity.ok(Map.of("conflict", false, "type", "", "detail", ""));
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Fecha inválida"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── HOLIDAYS ───────────────────

    @GetMapping("/holidays")
    public ResponseEntity<?> getHolidays(
            @PathVariable Long businessId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            return ResponseEntity.ok(attendanceService.getHolidays(businessId, year, month)
                    .stream().map(this::holidayToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/holidays")
    public ResponseEntity<?> addHoliday(
            @PathVariable Long businessId,
            @RequestBody Map<String, String> body) {
        try {
            LocalDate date = LocalDate.parse(body.get("date"));
            String name    = body.get("name");
            return ResponseEntity.ok(holidayToMap(
                    attendanceService.addBusinessHoliday(businessId, date, name)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<?> deleteHoliday(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            attendanceService.deleteHoliday(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/employees/{employeeId}/work-schedule-start")
    public ResponseEntity<?> setWorkScheduleStartDate(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody Map<String, String> body) {
        try {
            String start = body.get("startDate");
            LocalDate date = (start == null || start.isBlank()) ? null : LocalDate.parse(start);
            attendanceService.setWorkScheduleStartDate(businessId, employeeId, date);
            return ResponseEntity.ok(Map.of(
                    "employeeId", employeeId,
                    "workScheduleStartDate", date != null ? date.toString() : null
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── PLANILLA MENSUAL ───────────────────

    @GetMapping("/sheet")
    public ResponseEntity<?> getMonthlySheet(
            @PathVariable Long businessId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Boolean includeAuto) {
        try {
            boolean useAuto = includeAuto != null ? includeAuto : true;
            List<Map<String, Object>> sheet = attendanceService.getMonthlySheet(businessId, year, month, useAuto);
            return ResponseEntity.ok(sheet);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/sheet/autocomplete")
    public ResponseEntity<?> autocompleteMonth(
            @PathVariable Long businessId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            Map<String, Object> out = attendanceService.autocompleteMonth(businessId, year, month);
            return ResponseEntity.ok(out);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/sheet/{employeeId}/day")
    public ResponseEntity<?> saveWorkDay(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody Map<String, String> body) {
        try {
            LocalDate date = LocalDate.parse(body.get("date"));
            String dayType = body.get("dayType");
            String notes   = body.get("notes");
            EmployeeWorkDay saved = attendanceService.saveWorkDay(businessId, employeeId, date, dayType, notes);
            return ResponseEntity.ok(Map.of(
                    "id",      saved.getId(),
                    "date",    saved.getWorkDate().toString(),
                    "dayType", saved.getDayType()
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/sheet/{employeeId}/day")
    public ResponseEntity<?> deleteWorkDay(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestParam String date) {
        try {
            attendanceService.deleteWorkDay(businessId, employeeId, LocalDate.parse(date));
            return ResponseEntity.ok(Map.of("deleted", true, "date", date));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sheet/{employeeId}/batch")
    public ResponseEntity<?> saveWorkDaysBatch(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody List<Map<String, String>> days) {
        try {
            int count = attendanceService.saveWorkDaysBatch(businessId, employeeId, days);
            return ResponseEntity.ok(Map.of("saved", count));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── HORAS EXTRA ───────────────────

    @GetMapping("/overtime")
    public ResponseEntity<?> getOvertime(
            @PathVariable Long businessId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            return ResponseEntity.ok(attendanceService.getOvertimeByBusiness(businessId, year, month)
                    .stream().map(this::overtimeToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/overtime/{employeeId}")
    public ResponseEntity<?> saveOvertime(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody EmployeeOvertime dto) {
        try {
            EmployeeOvertime saved = attendanceService.saveOvertime(businessId, employeeId, dto);
            return ResponseEntity.ok(overtimeToMap(saved));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/overtime/{id}")
    public ResponseEntity<?> deleteOvertime(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            attendanceService.deleteOvertime(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── VACACIONES ───────────────────

    @GetMapping("/vacations")
    public ResponseEntity<?> getVacations(
            @PathVariable Long businessId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            return ResponseEntity.ok(attendanceService.getVacationsByBusiness(businessId, year, month)
                    .stream().map(this::vacationToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/vacations/{employeeId}")
    public ResponseEntity<?> saveVacation(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody EmployeeVacation dto) {
        try {
            EmployeeVacation saved = attendanceService.saveVacation(businessId, employeeId, dto);
            return ResponseEntity.ok(vacationToMap(saved));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/vacations/{id}/upload-signed")
    public ResponseEntity<?> uploadVacationSignedPdf(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        String relativePath;
        try {
            java.nio.file.Path base = java.nio.file.Paths.get(storageBaseDir);
            java.nio.file.Path uploadDir = base.resolve(java.nio.file.Paths.get("signed-pdfs", "vacations"));
            java.nio.file.Files.createDirectories(uploadDir);
            String filename = businessId + "_vac_" + id + "_" + System.currentTimeMillis() + ".pdf";
            java.nio.file.Path target = uploadDir.resolve(filename);
            try (java.io.InputStream in = file.getInputStream()) {
                java.nio.file.Files.copy(in, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            // Guardar ruta relativa basada en 'app.storage.location'
            relativePath = (storageBaseDir + "/signed-pdfs/vacations/" + filename).replace('\\','/');
            log.debug("[upload-signed] Saved file to {} (absolute: {})", relativePath, target.toAbsolutePath());
        } catch (java.io.IOException e) {
            log.error("[upload-signed] IO error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al guardar el archivo: " + e.getMessage()));
        }
        try {
            EmployeeVacation updated = attendanceService.setVacationSignedPdf(businessId, id, relativePath);
            // Al subir PDF, estado = PENDIENTE (a revisión)
            updated = attendanceService.updateVacationStatus(businessId, id, "PENDIENTE");
            return ResponseEntity.ok(vacationToMap(updated));
        } catch (NoSuchElementException e) {
            log.error("[upload-signed] Vacacion no encontrada: {}", id, e);
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            log.error("[upload-signed] Seguridad: {}", e.getMessage(), e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[upload-signed] Error inesperado: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/vacations/{id}/status")
    public ResponseEntity<?> updateVacationStatus(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            EmployeeVacation updated = attendanceService.updateVacationStatus(businessId, id, status);
            return ResponseEntity.ok(vacationToMap(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/vacations/{id}/pdf")
    public ResponseEntity<?> getVacationSignedPdf(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            // Buscar registro para obtener la ruta
            java.util.Optional<EmployeeVacation> opt = attendanceService.getVacationsByBusiness(businessId, null, null)
                    .stream().filter(v -> v.getId().equals(id)).findFirst();
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            String path = opt.get().getSignedPdfPath();
            if (path == null || path.isBlank()) return ResponseEntity.notFound().build();
            java.nio.file.Path p = java.nio.file.Paths.get(path);
            if (!java.nio.file.Files.exists(p)) return ResponseEntity.notFound().build();
            Resource res = new FileSystemResource(p.toFile());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/vacations/{id}")
    public ResponseEntity<?> deleteVacation(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            attendanceService.deleteVacation(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── PERMISOS ───────────────────

    @GetMapping("/permissions")
    public ResponseEntity<?> getPermissions(
            @PathVariable Long businessId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            return ResponseEntity.ok(attendanceService.getPermissionsByBusiness(businessId, year, month)
                    .stream().map(this::permissionToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/permissions/{employeeId}")
    public ResponseEntity<?> savePermission(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody EmployeePermission dto) {
        try {
            EmployeePermission saved = attendanceService.savePermission(businessId, employeeId, dto);
            return ResponseEntity.ok(permissionToMap(saved));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/permissions/{id}")
    public ResponseEntity<?> getPermissionById(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            EmployeePermission p = attendanceService.getPermissionById(businessId, id);
            return ResponseEntity.ok(permissionToMap(p));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/permissions/{id}")
    public ResponseEntity<?> updatePermission(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestBody EmployeePermission body) {
        try {
            EmployeePermission updated = attendanceService.updatePermission(businessId, id, body);
            return ResponseEntity.ok(permissionToMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/permissions/{id}/status")
    public ResponseEntity<?> updatePermissionStatus(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            EmployeePermission updated = attendanceService.updatePermissionStatus(businessId, id, status);
            return ResponseEntity.ok(permissionToMap(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/permissions/{id}/upload-signed", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPermissionSignedPdf(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        String relativePath;
        try {
            java.nio.file.Path base = java.nio.file.Paths.get(storageBaseDir);
            java.nio.file.Path uploadDir = base.resolve(java.nio.file.Paths.get("signed-pdfs", "permissions"));
            java.nio.file.Files.createDirectories(uploadDir);
            String filename = businessId + "_perm_" + id + "_" + System.currentTimeMillis() + ".pdf";
            java.nio.file.Path target = uploadDir.resolve(filename);
            try (java.io.InputStream in = file.getInputStream()) {
                java.nio.file.Files.copy(in, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            relativePath = (storageBaseDir + "/signed-pdfs/permissions/" + filename).replace('\\','/');
            log.debug("[permissions/upload-signed] Saved file to {} (absolute: {})", relativePath, target.toAbsolutePath());
        } catch (java.io.IOException e) {
            log.error("[permissions/upload-signed] IO error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al guardar el archivo: " + e.getMessage()));
        }
        try {
            EmployeePermission updated = attendanceService.setPermissionSignedPdf(businessId, id, relativePath);
            // Opcionalmente poner PENDIENTE tras carga para revisión manual
            updated = attendanceService.updatePermissionStatus(businessId, id, "PENDIENTE");
            return ResponseEntity.ok(permissionToMap(updated));
        } catch (NoSuchElementException e) {
            log.error("[permissions/upload-signed] Permiso no encontrado: {}", id, e);
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            log.error("[permissions/upload-signed] Seguridad: {}", e.getMessage(), e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[permissions/upload-signed] Error inesperado: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<?> deletePermission(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            attendanceService.deletePermission(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── INCIDENTES ───────────────────

    @GetMapping("/incidents")
    public ResponseEntity<?> getIncidents(
            @PathVariable Long businessId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            return ResponseEntity.ok(attendanceService.getIncidentsByBusiness(businessId, year, month)
                    .stream().map(this::incidentToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/incidents/{employeeId}")
    public ResponseEntity<?> saveIncident(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody EmployeeIncident dto) {
        try {
            EmployeeIncident saved = attendanceService.saveIncident(businessId, employeeId, dto);
            return ResponseEntity.ok(incidentToMap(saved));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/incidents/{id}")
    public ResponseEntity<?> deleteIncident(
            @PathVariable Long businessId,
            @PathVariable Long id) {
        try {
            attendanceService.deleteIncident(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── HISTÓRICO DE JORNADAS ───────────────────

    @GetMapping("/employees/{employeeId}/schedule-history")
    public ResponseEntity<?> getScheduleHistory(
            @PathVariable Long businessId,
            @PathVariable Long employeeId) {
        try {
            List<EmployeeWorkScheduleHistory> list = attendanceService.getScheduleHistory(businessId, employeeId);
            return ResponseEntity.ok(list.stream().map(this::historyToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/employees/{employeeId}/schedule-history")
    public ResponseEntity<?> addScheduleHistory(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody Map<String, String> body) {
        try {
            Long workScheduleId = Long.parseLong(body.get("workScheduleId"));
            LocalDate startDate = LocalDate.parse(body.get("startDate"));
            LocalDate endDate = body.get("endDate") != null && !body.get("endDate").isBlank()
                    ? LocalDate.parse(body.get("endDate")) : null;
            LocalDate cycleStartDate = body.get("cycleStartDate") != null && !body.get("cycleStartDate").isBlank()
                    ? LocalDate.parse(body.get("cycleStartDate")) : null;
            Double dailyHours = null;
            if (body.get("dailyHours") != null && !body.get("dailyHours").isBlank()) {
                dailyHours = Double.parseDouble(body.get("dailyHours"));
            }
            String notes = body.get("notes");
            EmployeeWorkScheduleHistory saved = attendanceService.addScheduleHistory(
                    businessId, employeeId, workScheduleId, startDate, endDate, cycleStartDate, dailyHours, notes);
            return ResponseEntity.ok(historyToMap(saved));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/schedule-history/{historyId}")
    public ResponseEntity<?> updateScheduleHistory(
            @PathVariable Long businessId,
            @PathVariable Long historyId,
            @RequestBody Map<String, String> body) {
        try {
            LocalDate startDate = body.get("startDate") != null && !body.get("startDate").isBlank()
                    ? LocalDate.parse(body.get("startDate")) : null;
            LocalDate endDate = body.get("endDate") != null && !body.get("endDate").isBlank()
                    ? LocalDate.parse(body.get("endDate")) : null;
            LocalDate cycleStartDate = body.get("cycleStartDate") != null && !body.get("cycleStartDate").isBlank()
                    ? LocalDate.parse(body.get("cycleStartDate")) : null;
            Long workScheduleId = null;
            if (body.get("workScheduleId") != null && !body.get("workScheduleId").isBlank()) {
                workScheduleId = Long.parseLong(body.get("workScheduleId"));
            }
            Double dailyHours = null;
            if (body.get("dailyHours") != null && !body.get("dailyHours").isBlank()) {
                dailyHours = Double.parseDouble(body.get("dailyHours"));
            }
            EmployeeWorkScheduleHistory updated = attendanceService.updateScheduleHistory(
                    businessId, historyId, startDate, endDate, cycleStartDate, workScheduleId, dailyHours, body.get("notes"));
            return ResponseEntity.ok(historyToMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/schedule-history/{historyId}")
    public ResponseEntity<?> deleteScheduleHistory(
            @PathVariable Long businessId,
            @PathVariable Long historyId) {
        try {
            attendanceService.deleteScheduleHistory(businessId, historyId);
            return ResponseEntity.ok(Map.of("deleted", historyId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── CIERRE MENSUAL ───────────────────

    @GetMapping("/closures")
    public ResponseEntity<?> getClosures(@PathVariable Long businessId) {
        try {
            return ResponseEntity.ok(attendanceService.getClosures(businessId)
                    .stream().map(this::closureToMap).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/closures/{year}/{month}")
    public ResponseEntity<?> getClosure(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month) {
        return attendanceService.getClosure(businessId, year, month)
                .<ResponseEntity<?>>map(c -> ResponseEntity.ok(closureToMap(c)))
                .orElse(ResponseEntity.ok(Map.of("status", "OPEN", "year", year, "month", month)));
    }

    @PostMapping("/closures/{year}/{month}/close")
    public ResponseEntity<?> closeMonth(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String closedBy = body != null ? body.getOrDefault("closedBy", "sistema") : "sistema";
            String notes    = body != null ? body.get("notes") : null;
            return ResponseEntity.ok(closureToMap(
                    attendanceService.closureMonth(businessId, year, month, closedBy, notes)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/closures/{year}/{month}/approve")
    public ResponseEntity<?> approveMonth(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String approvedBy     = body != null ? body.getOrDefault("approvedBy", "sistema") : "sistema";
            String signedPdfPath  = body != null ? body.get("signedPdfPath") : null;
            return ResponseEntity.ok(closureToMap(
                    attendanceService.approveMonth(businessId, year, month, approvedBy, signedPdfPath)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/closures/{year}/{month}/reopen")
    public ResponseEntity<?> reopenMonth(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month) {
        try {
            return ResponseEntity.ok(closureToMap(
                    attendanceService.reopenMonth(businessId, year, month)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(value = "/closures/{year}/{month}/upload-signed", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadSignedPdf(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month,
            @RequestParam("file") MultipartFile file) {
        // 1) Guardar el archivo firmado en el mismo esquema de storage que vacaciones/permisos
        String relativePath;
        try {
            java.nio.file.Path base = java.nio.file.Paths.get(storageBaseDir);
            java.nio.file.Path uploadDir = base.resolve(java.nio.file.Paths.get("signed-pdfs", "closures"));
            java.nio.file.Files.createDirectories(uploadDir);

            String filename = businessId + "_closure_" + year + "_" + String.format("%02d", month)
                    + "_" + System.currentTimeMillis() + ".pdf";
            java.nio.file.Path target = uploadDir.resolve(filename);
            try (java.io.InputStream in = file.getInputStream()) {
                java.nio.file.Files.copy(in, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            // Ruta relativa basada en 'app.storage.location'
            relativePath = (storageBaseDir + "/signed-pdfs/closures/" + filename).replace('\\', '/');
            log.debug("[closures/upload-signed] Saved file to {} (absolute: {})", relativePath, target.toAbsolutePath());
        } catch (java.io.IOException e) {
            log.error("[closures/upload-signed] IO error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al guardar el archivo: " + e.getMessage()));
        }

        // 2) Cerrar el mes si no está cerrado aún, luego aprobar con la ruta del PDF firmado
        try {
            java.util.Optional<MonthlySheetClosure> existing =
                    attendanceService.getClosure(businessId, year, month);
            String currentStatus = existing.map(MonthlySheetClosure::getStatus).orElse("OPEN");

            if ("APPROVED".equals(currentStatus)) {
                return ResponseEntity.status(409).body(Map.of("error", "Este mes ya está aprobado."));
            }
            if (!"CLOSED".equals(currentStatus)) {
                attendanceService.closureMonth(businessId, year, month, "sistema", null);
            }

            MonthlySheetClosure approved =
                    attendanceService.approveMonth(businessId, year, month, "sistema", relativePath);
            return ResponseEntity.ok(closureToMap(approved));
        } catch (IllegalStateException e) {
            log.error("[closures/upload-signed] Estado inválido: {}", e.getMessage(), e);
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            log.error("[closures/upload-signed] Cierre no encontrado para {}/{}/{}", businessId, year, month, e);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("[closures/upload-signed] Error inesperado: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/closures/{year}/{month}/signed-pdf")
    public ResponseEntity<?> getClosureSignedPdf(
            @PathVariable Long businessId,
            @PathVariable int year,
            @PathVariable int month) {
        try {
            java.util.Optional<MonthlySheetClosure> opt = attendanceService.getClosure(businessId, year, month);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            String path = opt.get().getSignedPdfPath();
            if (path == null || path.isBlank()) return ResponseEntity.notFound().build();
            java.nio.file.Path p = java.nio.file.Paths.get(path);
            if (!java.nio.file.Files.exists(p)) return ResponseEntity.notFound().build();
            Resource res = new FileSystemResource(p.toFile());
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────── mappers ───────────────────

    private Map<String, Object> overtimeToMap(EmployeeOvertime o) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",           o.getId());
        m.put("employeeId",   o.getEmployee().getId());
        m.put("employeeName", o.getEmployee().getFullName());
        m.put("cedula",       o.getEmployee().getCedula());
        m.put("overtimeDate", o.getOvertimeDate() != null ? o.getOvertimeDate().toString() : null);
        m.put("startTime",    o.getStartTime() != null ? o.getStartTime().toString() : null);
        m.put("endTime",      o.getEndTime() != null ? o.getEndTime().toString() : null);
        m.put("hoursTotal",   o.getHoursTotal());
        m.put("reason",       o.getReason());
        m.put("notes",        o.getNotes());
        m.put("createdAt",    o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> holidayToMap(Holiday h) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",      h.getId());
        m.put("date",    h.getDate() != null ? h.getDate().toString() : null);
        m.put("name",    h.getName());
        m.put("active",  h.getActive());
        m.put("scope",   h.getBusiness() == null ? "NATIONAL" : "BUSINESS");
        m.put("businessId", h.getBusiness() != null ? h.getBusiness().getId() : null);
        return m;
    }

    private Map<String, Object> vacationToMap(EmployeeVacation v) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",             v.getId());
        m.put("employeeId",     v.getEmployee().getId());
        m.put("employeeName",   v.getEmployee().getFullName());
        m.put("cedula",         v.getEmployee().getCedula());
        m.put("startDate",      v.getStartDate() != null ? v.getStartDate().toString() : null);
        m.put("endDate",        v.getEndDate() != null ? v.getEndDate().toString() : null);
        m.put("daysTaken",      v.getDaysTaken());
        m.put("daysAccumulated",v.getDaysAccumulated());
        m.put("status",         v.getStatus());
        m.put("notes",          v.getNotes());
        m.put("signedPdfPath",  v.getSignedPdfPath());
        m.put("createdAt",      v.getCreatedAt() != null ? v.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> permissionToMap(EmployeePermission p) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",             p.getId());
        m.put("employeeId",     p.getEmployee().getId());
        m.put("employeeName",   p.getEmployee().getFullName());
        m.put("cedula",         p.getEmployee().getCedula());
        m.put("permissionDate", p.getPermissionDate() != null ? p.getPermissionDate().toString() : null);
        m.put("permissionType", p.getPermissionType());
        m.put("hoursRequested", p.getHoursRequested());
        m.put("reason",         p.getReason());
        m.put("status",         p.getStatus());
        m.put("notes",          p.getNotes());
        m.put("signedPdfPath",  p.getSignedPdfPath());
        m.put("createdAt",      p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> incidentToMap(EmployeeIncident i) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",           i.getId());
        m.put("employeeId",   i.getEmployee().getId());
        m.put("employeeName", i.getEmployee().getFullName());
        m.put("cedula",       i.getEmployee().getCedula());
        m.put("incidentDate", i.getIncidentDate() != null ? i.getIncidentDate().toString() : null);
        m.put("incidentTime", i.getIncidentTime() != null ? i.getIncidentTime().toString() : null);
        m.put("incidentType", i.getIncidentType());
        m.put("description",  i.getDescription());
        m.put("location",     i.getLocation());
        m.put("severity",     i.getSeverity());
        m.put("notes",        i.getNotes());
        m.put("createdAt",    i.getCreatedAt() != null ? i.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> historyToMap(EmployeeWorkScheduleHistory h) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",                 h.getId());
        m.put("employeeId",         h.getEmployee().getId());
        m.put("employeeName",       h.getEmployee().getFullName());
        m.put("workScheduleId",     h.getWorkSchedule() != null ? h.getWorkSchedule().getId() : null);
        m.put("workScheduleName",   h.getWorkSchedule() != null ? h.getWorkSchedule().getName() : null);
        m.put("startDate",          h.getStartDate() != null ? h.getStartDate().toString() : null);
        m.put("endDate",            h.getEndDate() != null ? h.getEndDate().toString() : null);
        m.put("cycleStartDate",     h.getCycleStartDate() != null ? h.getCycleStartDate().toString() : null);
        m.put("dailyHours",         h.getDailyHours());
        m.put("notes",              h.getNotes());
        m.put("createdAt",          h.getCreatedAt() != null ? h.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> closureToMap(MonthlySheetClosure c) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",             c.getId());
        m.put("businessId",     c.getBusiness().getId());
        m.put("year",           c.getYear());
        m.put("month",          c.getMonth());
        m.put("status",         c.getStatus());
        m.put("closedAt",       c.getClosedAt() != null ? c.getClosedAt().toString() : null);
        m.put("closedBy",       c.getClosedBy());
        m.put("approvedAt",     c.getApprovedAt() != null ? c.getApprovedAt().toString() : null);
        m.put("approvedBy",     c.getApprovedBy());
        m.put("pdfPath",        c.getPdfPath());
        m.put("signedPdfPath",  c.getSignedPdfPath());
        m.put("peopleCount",    c.getPeopleCount());
        m.put("hhttTotalHours", c.getHhttTotalHours());
        m.put("notes",          c.getNotes());
        m.put("createdAt",      c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return m;
    }
}
