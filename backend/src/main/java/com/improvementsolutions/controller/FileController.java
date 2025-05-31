package com.improvementsolutions.controller;


import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.improvementsolutions.storage.StorageException;
import com.improvementsolutions.storage.StorageService;
import com.improvementsolutions.model.FileResponse;

@RestController
@RequestMapping("/api/files")
public class FileController {
    
    private static final Logger logger = LoggerFactory.getLogger(FileController.class);
    private final StorageService storageService;
    
    @Autowired
    public FileController(StorageService storageService) {
        this.storageService = storageService;
    }
    
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<FileResponse> handleFileUpload(@RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                logger.warn("No se proporcionó ningún archivo");
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(new FileResponse("No se proporcionó ningún archivo"));
            }

            validateFile(file);
            String filename = storageService.store(file);
            FileResponse response = createFileResponse(file, filename);
            logger.info("Archivo subido exitosamente: {}", filename);
            return ResponseEntity.ok(response);
        } catch (StorageException e) {
            logger.error("Error de almacenamiento al subir archivo: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new FileResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error interno al subir archivo: {}", e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new FileResponse("Error interno al subir archivo"));
        }
    }    @PostMapping("/upload/{directory}")
    public ResponseEntity<FileResponse> handleFileUploadToDirectory(
            @PathVariable String directory,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        try {
            // Verifica si se requiere autorización para directorios que no sean "logos"
            if (!"logos".equals(directory)) {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication == null || !authentication.isAuthenticated() || 
                    authentication instanceof AnonymousAuthenticationToken) {
                    return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(new FileResponse("Debe autenticarse para acceder a este recurso"));
                }
            }
            
            if (file == null || file.isEmpty()) {
                logger.warn("No se proporcionó ningún archivo para el directorio: {}", directory);
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(new FileResponse("No se proporcionó ningún archivo"));
            }

            validateFile(file);
            validateDirectory(directory);
            
            logger.info("⭐ Recibiendo archivo para directorio {}: {}, tipo: {}, tamaño: {}", 
                directory, file.getOriginalFilename(), file.getContentType(), file.getSize());
            
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = generateUniqueFilename(fileExtension);
            
            String storedPath = storageService.store(directory, file, uniqueFilename);
            FileResponse response = createFileResponse(file, storedPath);
            
            logger.info("✅ Archivo subido exitosamente al directorio {}: {}", directory, uniqueFilename);
            return ResponseEntity.ok(response);
        } catch (StorageException e) {
            logger.error("Error de validación para directorio {}: {}", directory, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new FileResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("❌ Error interno al subir archivo al directorio {}: {}", directory, e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new FileResponse("Error interno del servidor al procesar el archivo"));
        }
    }
    
    @GetMapping("/download/{filename:.+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Resource file = storageService.loadAsResource(filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                    .body(file);
        } catch (StorageException e) {
            logger.error("Archivo no encontrado: {}", filename, e);
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/download/{directory}/{filename:.+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Resource> serveFileFromDirectory(
            @PathVariable String directory,
            @PathVariable String filename) {
        try {
            validateDirectory(directory);
            Resource file = storageService.loadAsResource(directory + "/" + filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                    .body(file);
        } catch (StorageException e) {
            logger.error("Archivo no encontrado en directorio {}: {}", directory, filename, e);
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/delete/{filename:.+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteFile(@PathVariable String filename) {
        try {
            storageService.delete(filename);
            logger.info("Archivo eliminado exitosamente: {}", filename);
            return ResponseEntity.ok().build();
        } catch (StorageException e) {
            logger.error("Archivo no encontrado: {}", filename, e);
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            logger.error("Error interno al eliminar archivo {}: {}", filename, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/delete/{directory}/{filename:.+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteFileFromDirectory(
            @PathVariable String directory,
            @PathVariable String filename) {
        try {
            validateDirectory(directory);
            storageService.delete(directory, filename);
            logger.info("Archivo eliminado exitosamente del directorio {}: {}", directory, filename);
            return ResponseEntity.ok().build();
        } catch (StorageException e) {
            logger.error("Archivo no encontrado en directorio {}: {}", directory, filename, e);
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            logger.error("Error interno al eliminar archivo {}/{}: {}", directory, filename, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }
    
    private String generateUniqueFilename(String extension) {
        return UUID.randomUUID().toString() + extension;
    }
    
    private FileResponse createFileResponse(MultipartFile file, String storedPath) {
        return new FileResponse(
            storedPath,
            null,
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            "File uploaded successfully"
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new StorageException("No se puede procesar un archivo vacío");
        }
        
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new StorageException("Nombre de archivo no válido");
        }

        // Validar tamaño máximo (configurable)
        long maxFileSize = 5 * 1024 * 1024; // 5MB por defecto
        if (file.getSize() > maxFileSize) {
            throw new StorageException(
                String.format("El archivo excede el tamaño máximo permitido de %d MB", maxFileSize / (1024 * 1024))
            );
        }
    }

    private void validateDirectory(String directory) {
        if (directory == null || directory.trim().isEmpty()) {
            throw new StorageException("Directorio no especificado");
        }
        
        // Validar que sea un directorio permitido
        if ("logos".equals(directory)) {
            // Validaciones específicas para logos
            return;
        }
        
        // Para otros directorios, validar el formato
        if (!directory.matches("^[a-zA-Z0-9_-]+$")) {
            throw new StorageException(
                "Nombre de directorio no válido. Solo se permiten letras, números, guiones y guiones bajos"
            );
        }
    }
}
