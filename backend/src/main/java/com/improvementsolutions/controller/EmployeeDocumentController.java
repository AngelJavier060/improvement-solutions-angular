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
        log.info("=== INICIO createEmployeeDocument ===");
        log.info("Parámetros recibidos: businessEmployeeId={}, typeDocumentId={}, startDate={}, endDate={}, description={}", 
                businessEmployeeId, typeDocumentId, startDate, endDate, description);
        log.info("Archivos recibidos: {}", files != null ? files.length : 0);
        
        try {
            // Validaciones tempranas con logging detallado
            log.info("Iniciando validaciones...");
            
            if (businessEmployeeId == null) {
                log.error("business_employee_id es requerido");
                return ResponseEntity.badRequest().body(Map.of("error", "business_employee_id es requerido"));
            }
            
            if (typeDocumentId == null) {
                log.error("type_document_id es requerido");
                return ResponseEntity.badRequest().body(Map.of("error", "type_document_id es requerido"));
            }
            
            log.info("Validaciones básicas OK");
            
            // Validar archivos si existen
            if (files != null && files.length > 0) {
                log.info("Validando {} archivos...", files.length);
                for (int i = 0; i < files.length; i++) {
                    MultipartFile file = files[i];
                    if (file != null && !file.isEmpty()) {
                        log.info("Archivo {}: nombre={}, tamaño={}, tipo={}", 
                                i, file.getOriginalFilename(), file.getSize(), file.getContentType());
                        
                        // Validar tamaño (20MB máximo según config)
                        if (file.getSize() > 20 * 1024 * 1024) {
                            log.error("Archivo {} excede 20MB: {} bytes", file.getOriginalFilename(), file.getSize());
                            return ResponseEntity.badRequest().body(Map.of(
                                    "error", "FILE_TOO_LARGE",
                                    "message", "El archivo " + file.getOriginalFilename() + " excede el límite de 20MB"
                            ));
                        }
                    }
                }
            }
            
            log.info("Validaciones de archivos OK, llamando al servicio...");
            
            List<MultipartFile> fileList = files != null ? Arrays.asList(files) : List.of();
            EmployeeDocumentResponse resp = documentService.create(businessEmployeeId, typeDocumentId, startDate, endDate, description, fileList);
            
            log.info("=== FIN createEmployeeDocument EXITOSO ===");
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
            
        } catch (IllegalArgumentException ex) {
            log.error("=== ERROR DE VALIDACIÓN en createEmployeeDocument ===");
            log.error("Mensaje: {}", ex.getMessage());
            log.error("Clase: {}", ex.getClass().getSimpleName());
            log.error("Stack trace:", ex);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "VALIDATION_ERROR",
                    "message", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("=== ERROR INTERNO en createEmployeeDocument ===");
            log.error("Mensaje: {}", e.getMessage());
            log.error("Clase: {}", e.getClass().getSimpleName());
            log.error("Stack trace completo:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", e.getMessage() != null ? e.getMessage() : "Error interno del servidor",
                    "type", e.getClass().getSimpleName()
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
