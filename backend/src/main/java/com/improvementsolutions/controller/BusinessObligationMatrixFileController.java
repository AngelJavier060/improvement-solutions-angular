package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessObligationMatrixFile;
import com.improvementsolutions.service.BusinessObligationMatrixFileService;
import com.improvementsolutions.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/obligation-matrices")
@RequiredArgsConstructor
public class BusinessObligationMatrixFileController {

    private final BusinessObligationMatrixFileService fileService;
    private final FileStorageService fileStorageService;

    @GetMapping("/{matrixId}/files")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessObligationMatrixFile>> listFiles(
            @PathVariable Long matrixId,
            @RequestParam(required = false) Integer version,
            @RequestParam(required = false, defaultValue = "false") boolean currentOnly
    ) {
        if (currentOnly) {
            return ResponseEntity.ok(fileService.findByMatrixIdCurrentVersion(matrixId));
        }
        if (version != null) {
            return ResponseEntity.ok(fileService.findByMatrixIdAndVersion(matrixId, version));
        }
        return ResponseEntity.ok(fileService.findByMatrixId(matrixId));
    }

    @PostMapping(value = "/{matrixId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusinessObligationMatrixFile> uploadFile(
            @PathVariable Long matrixId,
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "description", required = false) String description
    ) throws IOException {
        BusinessObligationMatrixFile created = fileService.uploadFile(matrixId, file, description);
        return ResponseEntity.status(201).body(created);
    }

    @GetMapping("/files/{fileId}/download")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Resource> download(@PathVariable Long fileId) {
        BusinessObligationMatrixFile file = fileService.findById(fileId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));
        Resource resource = fileStorageService.loadFileAsResource(file.getPath());
        String filename = file.getName() != null ? file.getName() : "archivo";

        // Detectar tipo de contenido basado en extensión para vista previa
        MediaType mediaType = detectMediaType(filename);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }

    private MediaType detectMediaType(String filename) {
        if (filename == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        String lowerFilename = filename.toLowerCase();

        if (lowerFilename.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        } else if (lowerFilename.endsWith(".docx")) {
            return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        } else if (lowerFilename.endsWith(".doc")) {
            return MediaType.parseMediaType("application/msword");
        } else if (lowerFilename.endsWith(".xlsx")) {
            return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } else if (lowerFilename.endsWith(".xls")) {
            return MediaType.parseMediaType("application/vnd.ms-excel");
        } else if (lowerFilename.endsWith(".txt")) {
            return MediaType.TEXT_PLAIN;
        } else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        } else if (lowerFilename.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        } else {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    @PutMapping("/files/{fileId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusinessObligationMatrixFile> updateDescription(
            @PathVariable Long fileId,
            @RequestBody Map<String, String> body
    ) {
        String description = body != null ? body.get("description") : null;
        BusinessObligationMatrixFile updated = fileService.update(fileId, description);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/files/{fileId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long fileId) {
        fileService.delete(fileId);
        return ResponseEntity.noContent().build();
    }
}
