package com.improvementsolutions.controller;

import com.improvementsolutions.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

/**
 * Controlador para servir imágenes de perfil de usuario
 */
@RestController
@RequestMapping("/files")
public class ProfilePictureController {
    
    private static final Logger logger = LoggerFactory.getLogger(ProfilePictureController.class);
    
    @Autowired
    private FileStorageService fileStorageService;
    
    /**
     * Obtiene una imagen de perfil
     */
    @GetMapping("/{subdir}/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String subdir, @PathVariable String filename) {
        try {
            String path = subdir + "/" + filename;
            Resource file = fileStorageService.loadFileAsResource(path);
            
            String contentType = determineContentType(filename);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=3600") // Cache por 1 hora
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(file);
        } catch (Exception e) {
            logger.error("Error al cargar archivo: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Determina el tipo de contenido basado en la extensión del archivo
     */
    private String determineContentType(String filename) {
        String extension = "";
        if (filename.contains(".")) {
            extension = filename.substring(filename.lastIndexOf(".") + 1);
        }
        
        switch (extension.toLowerCase()) {
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            default:
                return "application/octet-stream";
        }
    }
}
