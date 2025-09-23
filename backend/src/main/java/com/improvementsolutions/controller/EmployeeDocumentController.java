package com.improvementsolutions.controller;

import com.improvementsolutions.dto.EmployeeDocumentResponse;
import com.improvementsolutions.service.BusinessEmployeeDocumentService;
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
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@Slf4j
public class EmployeeDocumentController {

    private final BusinessEmployeeDocumentService documentService;

    @GetMapping("/document/{cedula}/cedula")
    public ResponseEntity<List<EmployeeDocumentResponse>> getByCedula(@PathVariable String cedula,
                                                                      @RequestParam(value = "includeHistory", defaultValue = "false") boolean includeHistory) {
        try {
            return ResponseEntity.ok(documentService.getByEmployeeCedula(cedula, includeHistory));
        } catch (Exception e) {
            log.error("Error obteniendo documentos por cédula {}: {}", cedula, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/employee_document/by-business-employee/{id}")
    public ResponseEntity<List<EmployeeDocumentResponse>> getByBusinessEmployee(@PathVariable("id") Long businessEmployeeId,
                                                                               @RequestParam(value = "includeHistory", defaultValue = "false") boolean includeHistory) {
        try {
            return ResponseEntity.ok(documentService.getByBusinessEmployeeId(businessEmployeeId, includeHistory));
        } catch (Exception e) {
            log.error("Error obteniendo documentos por businessEmployeeId {}: {}", businessEmployeeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(value = "/employee_document", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createEmployeeDocument(
            @RequestParam("business_employee_id") Long businessEmployeeId,
            @RequestParam("type_document_id") Long typeDocumentId,
            @RequestParam(value = "start_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(value = "end_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "files[]", required = false) MultipartFile[] files
    ) {
        try {
            List<MultipartFile> fileList = files != null ? Arrays.asList(files) : List.of();
            EmployeeDocumentResponse resp = documentService.create(businessEmployeeId, typeDocumentId, startDate, endDate, description, fileList);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException ex) {
            log.error("Error de validación al crear documento: {}", ex.getMessage(), ex);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "VALIDATION_ERROR",
                    "message", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error interno al crear documento", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", e.getMessage() != null ? e.getMessage() : "Unexpected error"
            ));
        }
    }

    @DeleteMapping("/employee_document/{id}")
    public ResponseEntity<Void> deleteEmployeeDocument(@PathVariable Long id) {
        try {
            documentService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
