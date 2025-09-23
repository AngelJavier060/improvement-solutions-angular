package com.improvementsolutions.controller;

import com.improvementsolutions.dto.EmployeeCourseResponse;
import com.improvementsolutions.service.BusinessEmployeeCourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@Slf4j
public class EmployeeCourseController {

    private final BusinessEmployeeCourseService courseService;

    @GetMapping("/employee_course/by-business-employee/{id}")
    public ResponseEntity<List<EmployeeCourseResponse>> getByBusinessEmployee(@PathVariable("id") Long businessEmployeeId,
                                                                              @RequestParam(value = "includeHistory", defaultValue = "false") boolean includeHistory) {
        try {
            return ResponseEntity.ok(courseService.getByBusinessEmployeeId(businessEmployeeId, includeHistory));
        } catch (Exception e) {
            log.error("Error obteniendo cursos por businessEmployeeId {}: {}", businessEmployeeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(value = "/employee_course", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createEmployeeCourse(
            @RequestParam("business_employee_id") Long businessEmployeeId,
            @RequestParam("course_certification_id") Long courseCertificationId,
            @RequestParam(value = "issue_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate issueDate,
            @RequestParam(value = "expiry_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate expiryDate,
            @RequestParam(value = "hours", required = false) Integer hours,
            @RequestParam(value = "score", required = false) String score,
            @RequestParam(value = "observations", required = false) String observations,
            @RequestParam(value = "files[]", required = false) MultipartFile[] files
    ) {
        try {
            List<MultipartFile> fileList = files != null ? Arrays.asList(files) : List.of();
            EmployeeCourseResponse resp = courseService.create(businessEmployeeId, courseCertificationId, issueDate, expiryDate, hours, score, observations, fileList);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException ex) {
            log.error("Error de validación al crear curso: {}", ex.getMessage(), ex);
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "error", "VALIDATION_ERROR",
                    "message", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error interno al crear curso", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", e.getMessage() != null ? e.getMessage() : "Unexpected error"
            ));
        }
    }

    @DeleteMapping("/employee_course/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            courseService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
