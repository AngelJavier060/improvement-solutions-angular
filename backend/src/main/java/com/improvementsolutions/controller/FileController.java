package com.improvementsolutions.controller;

import com.improvementsolutions.dto.FileResponseDto;
import com.improvementsolutions.service.FileStorageService;
import com.improvementsolutions.service.FileUrlService;
import com.improvementsolutions.storage.FileUrlHelper;
import com.improvementsolutions.storage.StorageException;
import com.improvementsolutions.storage.StorageFileNotFoundException;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para la gestión de archivos
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 * IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
 */
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private final StorageService storageService;
    private final FileUrlHelper fileUrlHelper;
    private final FileStorageService fileStorageService;
    private final FileUrlService fileUrlService;

    /**
     * Endpoint para subir un archivo a una carpeta específica
     */
    @PostMapping("/upload/{directory}")
    public ResponseEntity<FileResponseDto> uploadFile(
            @PathVariable String directory,
            @RequestParam("file") MultipartFile file) {
        
        try {
            String timestamp = String.valueOf(System.currentTimeMillis());
            String originalFilename = file.getOriginalFilename();
            String fileName = timestamp + "_" + originalFilename;
            
            String path = storageService.store(directory, file, fileName);
            String tempUrl = fileUrlHelper.getTemporaryUrl(path, 60);
            
            FileResponseDto response = FileResponseDto.builder()
                    .url(path)
                    .temporaryUrl(tempUrl)
                    .filename(fileName)
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new StorageException("No se pudo guardar el archivo", e);
        }
    }

    /**
     * Endpoint para subir un archivo al almacenamiento general
     */
    @PostMapping("/upload")
    public ResponseEntity<FileResponseDto> uploadFile(
            @RequestParam("file") MultipartFile file) {
        
        try {
            String path = storageService.store(file);
            String tempUrl = fileUrlHelper.getTemporaryUrl(path, 60);
            
            FileResponseDto response = FileResponseDto.builder()
                    .url(path)
                    .temporaryUrl(tempUrl)
                    .filename(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new StorageException("No se pudo guardar el archivo", e);
        }
    }

    /**
     * Endpoint para descargar un archivo
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        Resource file = storageService.loadAsResource(filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .body(file);
    }

    /**
     * Endpoint para descargar un archivo de una carpeta específica
     */
    @GetMapping("/{directory}/{filename:.+}")
    public ResponseEntity<Resource> getFile(
            @PathVariable String directory,
            @PathVariable String filename) {
        
        Resource file = storageService.loadAsResource(directory, filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .body(file);
    }

    /**
     * Endpoint para generar una URL temporal para un archivo
     */
    @GetMapping("/temp/{path:.+}")
    public ResponseEntity<Map<String, String>> getTemporaryUrl(
            @PathVariable String path,
            @RequestParam(value = "minutes", defaultValue = "5") int minutes) {
        
        String tempUrl = fileUrlHelper.getTemporaryUrl(path, minutes);
        Map<String, String> response = new HashMap<>();
        response.put("url", tempUrl);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint para servir archivos a través de URLs temporales
     * @param token Token JWT que contiene la ruta del archivo
     * @return El archivo como recurso
     */
    @GetMapping("/temp")
    public ResponseEntity<Resource> getTemporaryFile(@RequestParam String token) {
        try {
            // Extraer la ruta del archivo desde el token
            String filePath = fileUrlService.getFilePathFromToken(token);
            
            if (filePath == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Cargar el archivo
            Resource resource = fileStorageService.loadFileAsResource(filePath);
            
            // Determinar el tipo de contenido
            String contentType = determineContentType(resource);
            
            // Construir la respuesta
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Determina el tipo de contenido del archivo basado en su extensión
     */
    private String determineContentType(Resource resource) throws IOException {
        String filename = resource.getFilename();
        if (filename == null) {
            return "application/octet-stream";
        }
        
        filename = filename.toLowerCase();
        if (filename.endsWith(".pdf")) {
            return "application/pdf";
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (filename.endsWith(".png")) {
            return "image/png";
        } else if (filename.endsWith(".gif")) {
            return "image/gif";
        } else if (filename.endsWith(".doc") || filename.endsWith(".docx")) {
            return "application/msword";
        } else if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) {
            return "application/vnd.ms-excel";
        } else {
            return "application/octet-stream";
        }
    }

    /**
     * Endpoint para eliminar un archivo
     */
    @DeleteMapping("/{filename:.+}")
    public ResponseEntity<Void> deleteFile(@PathVariable String filename) {
        try {
            storageService.delete(filename);
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            throw new StorageException("No se pudo eliminar el archivo", e);
        }
    }

    /**
     * Endpoint para eliminar un archivo de una carpeta específica
     */
    @DeleteMapping("/{directory}/{filename:.+}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable String directory,
            @PathVariable String filename) {
        
        try {
            storageService.delete(directory, filename);
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            throw new StorageException("No se pudo eliminar el archivo", e);
        }
    }

    /**
     * Manejador para la excepción de archivo no encontrado
     */
    @ExceptionHandler(StorageFileNotFoundException.class)
    public ResponseEntity<?> handleStorageFileNotFound(StorageFileNotFoundException exc) {
        return ResponseEntity.notFound().build();
    }

    /**
     * Manejador para las excepciones de almacenamiento
     */
    @ExceptionHandler(StorageException.class)
    public ResponseEntity<?> handleStorageException(StorageException exc) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", exc.getMessage()));
    }
}