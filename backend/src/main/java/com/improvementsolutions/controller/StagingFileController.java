package com.improvementsolutions.controller;

import com.improvementsolutions.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files/staging")
@RequiredArgsConstructor
@Slf4j
public class StagingFileController {

    private final FileStorageService fileStorageService;

    // Subida temporal para Matriz Legal (PDF y Word)
    @PostMapping(value = "/obligation-matrix", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<Map<String, Object>> uploadToStaging(
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> resp = new HashMap<>();
        if (file == null || file.isEmpty()) {
            log.warn("[Staging] Upload rejected: empty file");
            resp.put("success", false);
            resp.put("message", "Archivo vacío");
            return ResponseEntity.badRequest().body(resp);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        String original = file.getOriginalFilename() == null ? "documento" : file.getOriginalFilename();
        log.info("[Staging] Upload received: name='{}', contentType='{}', size={} bytes", original, contentType, file.getSize());
        if (!(contentType.equalsIgnoreCase("application/pdf") || original.toLowerCase().endsWith(".pdf") ||
              contentType.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
              original.toLowerCase().endsWith(".docx") ||
              contentType.equalsIgnoreCase("application/msword") || original.toLowerCase().endsWith(".doc"))) {
            log.warn("[Staging] Upload rejected: invalid type. name='{}', contentType='{}'", original, contentType);
            resp.put("success", false);
            resp.put("message", "Solo se permiten archivos PDF y Word");
            return ResponseEntity.badRequest().body(resp);
        }
        try {
            String path = fileStorageService.storeFile(file, "staging/obligation_matrix");
            log.info("[Staging] Upload stored successfully: path='{}', name='{}', size={} bytes", path, original, file.getSize());
            resp.put("success", true);
            resp.put("stagingPath", path);
            resp.put("originalName", original);
            resp.put("size", file.getSize());
            resp.put("mimeType", contentType);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("[Staging] Upload failed for '{}': {}", original, e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("title", "Error al guardar archivo");
            err.put("message", "No se pudo almacenar el archivo en el servidor.");
            err.put("code", "STAGING_STORE_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
