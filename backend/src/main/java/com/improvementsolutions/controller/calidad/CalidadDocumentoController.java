package com.improvementsolutions.controller.calidad;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.dto.calidad.CalidadDocumentoDto;
import com.improvementsolutions.dto.calidad.CalidadDocumentoRequest;
import com.improvementsolutions.service.calidad.CalidadDocumentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calidad/{ruc}/documentos")
@RequiredArgsConstructor
public class CalidadDocumentoController {

    private final CalidadDocumentoService service;
    private final ObjectMapper objectMapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> list(@PathVariable String ruc) {
        try {
            List<CalidadDocumentoDto> list = service.list(ruc);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> get(@PathVariable String ruc, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.get(ruc, id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> create(
            @PathVariable String ruc,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        try {
            CalidadDocumentoRequest req = objectMapper.readValue(dataJson, CalidadDocumentoRequest.class);
            CalidadDocumentoDto created = service.create(ruc, req, file);
            return ResponseEntity.status(201).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> update(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        try {
            CalidadDocumentoRequest req = objectMapper.readValue(dataJson, CalidadDocumentoRequest.class);
            return ResponseEntity.ok(service.update(ruc, id, req, file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> delete(@PathVariable String ruc, @PathVariable Long id) {
        try {
            service.delete(ruc, id);
            return ResponseEntity.ok(Map.of("message", "Eliminado"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/file")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','USER')")
    public ResponseEntity<?> downloadFile(@PathVariable String ruc, @PathVariable Long id) {
        try {
            Resource resource = service.loadFile(ruc, id);
            String filename = service.fileDownloadName(ruc, id);
            String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encoded)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }
}
