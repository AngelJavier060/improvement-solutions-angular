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
    public ResponseEntity<FileResponse> handleFileUpload(@RequestParam("file") MultipartFile file) {
        try {
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
    }

    @PostMapping("/upload/{directory}")
    public ResponseEntity<FileResponse> handleFileUploadToDirectory(
            @PathVariable String directory,
            @RequestParam("file") MultipartFile file) {
        try {
            validateFile(file);
            validateDirectory(directory);
            
            // Generar nombre único para el archivo
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = generateUniqueFilename(fileExtension);
            
            // Almacenar archivo
            String storedPath = storageService.store(directory, file, uniqueFilename);
            FileResponse response = createFileResponse(file, storedPath);
            
            logger.info("Archivo subido exitosamente al directorio {}: {}", directory, uniqueFilename);
            return ResponseEntity.ok(response);
            
        } catch (StorageException e) {
            logger.error("Error al validar archivo para directorio {}: {}", directory, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new FileResponse(e.getMessage()));
                    
        } catch (IOException e) {
            logger.error("Error de E/S al subir archivo al directorio {}: {}", directory, e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new FileResponse("Error al procesar el archivo: " + e.getMessage()));
                    
        } catch (Exception e) {
            logger.error("Error interno al subir archivo al directorio {}: {}", directory, e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new FileResponse("Error interno del servidor al procesar el archivo: " + e.getMessage()));
        }
    }
    
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Resource file = storageService.loadAsResource(filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                    .body(file);
        } catch (Exception e) {
            logger.error("Error al servir archivo {}: {}", filename, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{directory}/{filename:.+}")
    public ResponseEntity<Resource> serveFileFromDirectory(
            @PathVariable String directory,
            @PathVariable String filename,
            @RequestParam(required = false) String token) {
        try {
            logger.info("Solicitando archivo {} del directorio {}", filename, directory);
            // No validamos el token aquí porque eso se maneja en los filtros de seguridad
            
            Resource file = storageService.loadAsResource(directory, filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                    .body(file);
        } catch (Exception e) {
            logger.error("Error al servir archivo {}/{}: {}", directory, filename, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
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
            storedPath,
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize()
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new StorageException("No se puede subir un archivo vacío");
        }
        if (file.getOriginalFilename() == null || file.getOriginalFilename().isEmpty()) {
            throw new StorageException("Nombre de archivo no válido");
        }
    }

    private void validateDirectory(String directory) {
        if (directory == null || directory.isEmpty()) {
            throw new StorageException("Directorio no válido");
        }
        if (!directory.matches("^[a-zA-Z0-9_-]+$")) {
            throw new StorageException("Nombre de directorio no válido. Solo se permiten letras, números, guiones y guiones bajos");
        }
    }
}
