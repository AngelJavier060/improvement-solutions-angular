package com.improvementsolutions.controller;

import com.improvementsolutions.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files/staging")
@RequiredArgsConstructor
public class StagingFileController {

    private final FileStorageService fileStorageService;

    // Subida temporal para Matriz Legal (PDF y Word)
    @PostMapping(value = "/obligation-matrix", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<Map<String, Object>> uploadToStaging(
            @RequestPart("file") MultipartFile file) throws Exception {
        Map<String, Object> resp = new HashMap<>();
        if (file == null || file.isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Archivo vacío");
            return ResponseEntity.badRequest().body(resp);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        String original = file.getOriginalFilename() == null ? "documento" : file.getOriginalFilename();
        if (!(contentType.equalsIgnoreCase("application/pdf") || original.toLowerCase().endsWith(".pdf") ||
              contentType.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
              original.toLowerCase().endsWith(".docx"))) {
            resp.put("success", false);
            resp.put("message", "Solo se permiten archivos PDF y Word");
            return ResponseEntity.badRequest().body(resp);
        }
        String path = fileStorageService.storeFile(file, "staging/obligation_matrix");
        resp.put("success", true);
        resp.put("stagingPath", path);
        resp.put("originalName", original);
        resp.put("size", file.getSize());
        resp.put("mimeType", contentType);
        return ResponseEntity.ok(resp);
    }
}
