package com.improvementsolutions.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.improvementsolutions.diagnostic.FileSystemDiagnostic;
import com.improvementsolutions.storage.StorageService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controlador para diagnóstico que ayuda a encontrar problemas en el sistema
 * de archivos y otras configuraciones.
 */
@RestController
@RequestMapping("/api/debug")
public class DebugController {
    private static final Logger logger = LoggerFactory.getLogger(DebugController.class);
    
    @Autowired
    private FileSystemDiagnostic fileSystemDiagnostic;
    
    @Autowired
    private StorageService storageService;
    
    @Value("${app.storage.location:uploads}")
    private String storageLocation;
    
    /**
     * Endpoint para diagnóstico del sistema de archivos
     */
    @GetMapping("/file-system")
    public ResponseEntity<Map<String, Object>> diagnoseFileSystem() {
        logger.info("Ejecutando diagnóstico del sistema de archivos");
        
        try {
            Map<String, Object> result = new HashMap<>();
            Path rootPath = Paths.get(storageLocation).toAbsolutePath().normalize();
            
            // Información general
            result.put("rootPath", rootPath.toString());
            result.put("rootExists", Files.exists(rootPath));
            result.put("rootReadable", Files.isReadable(rootPath));
            result.put("rootWritable", Files.isWritable(rootPath));
            
            // Información del directorio de logos
            Path logosPath = rootPath.resolve("logos");
            result.put("logosPath", logosPath.toString());
            result.put("logosExists", Files.exists(logosPath));
            result.put("logosReadable", Files.exists(logosPath) && Files.isReadable(logosPath));
            result.put("logosWritable", Files.exists(logosPath) && Files.isWritable(logosPath));
            
            // Listar archivos
            if (Files.exists(logosPath)) {
                result.put("logoFiles", Files.list(logosPath)
                    .map(p -> {
                        try {
                            return Map.of(
                                "name", p.getFileName().toString(),
                                "size", Files.size(p),
                                "lastModified", Files.getLastModifiedTime(p).toString()
                            );
                        } catch (Exception e) {
                            return Map.of(
                                "name", p.getFileName().toString(),
                                "error", e.getMessage()
                            );
                        }
                    })
                    .collect(Collectors.toList()));
            }
            
            // Ejecutar diagnóstico completo
            fileSystemDiagnostic.diagnoseFileSystem();
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error en diagnóstico de sistema de archivos", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Verifica si un archivo específico existe en el sistema
     */
    @GetMapping("/file-exists/{directory}/{filename}")
    public ResponseEntity<Map<String, Object>> checkFileExists(
            @PathVariable String directory, 
            @PathVariable String filename) {
        
        logger.info("Verificando existencia de archivo {}/{}", directory, filename);
        
        try {
            Path rootPath = Paths.get(storageLocation).toAbsolutePath().normalize();
            Path dirPath = rootPath.resolve(directory);
            Path filePath = dirPath.resolve(filename);
            
            boolean exists = Files.exists(filePath);
            Map<String, Object> result = new HashMap<>();
            
            result.put("directory", directory);
            result.put("filename", filename);
            result.put("fullPath", filePath.toString());
            result.put("exists", exists);
            
            if (exists) {
                result.put("size", Files.size(filePath));
                result.put("lastModified", Files.getLastModifiedTime(filePath).toString());
                result.put("readable", Files.isReadable(filePath));
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error al verificar existencia de archivo", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
