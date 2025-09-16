package com.improvementsolutions.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@Slf4j
public class FileUploadController {

    @Value("${file.upload.employees.photos.dir:uploads/employees/photos}")
    private String employeePhotosDir;

    @PostMapping("/employee-photo")
    public ResponseEntity<Map<String, Object>> uploadEmployeePhoto(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validar que se ha enviado un archivo
            if (file.isEmpty()) {
                response.put("error", "No se ha enviado ningún archivo");
                return ResponseEntity.badRequest().body(response);
            }

            // Validar tipo de archivo
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("error", "El archivo debe ser una imagen");
                return ResponseEntity.badRequest().body(response);
            }

            // Validar tamaño del archivo (5MB máximo)
            if (file.getSize() > 5 * 1024 * 1024) {
                response.put("error", "El archivo no puede superar los 5MB");
                return ResponseEntity.badRequest().body(response);
            }

            // Crear directorio si no existe
            Path uploadPath = Paths.get(employeePhotosDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generar nombre único para el archivo
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(fileName);

            // Guardar el archivo
            Files.copy(file.getInputStream(), filePath);

            // Retornar información del archivo guardado
            response.put("success", true);
            response.put("fileName", fileName);
            response.put("filePath", filePath.toString());
            response.put("url", "/api/files/employee-photo/" + fileName);
            response.put("size", file.getSize());
            response.put("type", contentType);

            log.info("Foto de empleado guardada: {}", fileName);
            
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("Error al guardar la foto del empleado", e);
            response.put("error", "Error interno del servidor al procesar el archivo");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            log.error("Error inesperado al procesar la foto del empleado", e);
            response.put("error", "Error inesperado al procesar el archivo");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/employee-photo/{fileName}")
    public ResponseEntity<byte[]> getEmployeePhoto(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get(employeePhotosDir).resolve(fileName);
            
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            
            // Determinar el tipo de contenido basado en la extensión
            String contentType = "image/jpeg"; // por defecto
            if (fileName.toLowerCase().endsWith(".png")) {
                contentType = "image/png";
            } else if (fileName.toLowerCase().endsWith(".gif")) {
                contentType = "image/gif";
            } else if (fileName.toLowerCase().endsWith(".webp")) {
                contentType = "image/webp";
            }

            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .body(fileContent);

        } catch (IOException e) {
            log.error("Error al leer la foto del empleado: {}", fileName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/employee-photo/{fileName}")
    public ResponseEntity<Map<String, Object>> deleteEmployeePhoto(@PathVariable String fileName) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Path filePath = Paths.get(employeePhotosDir).resolve(fileName);
            
            if (!Files.exists(filePath)) {
                response.put("error", "El archivo no existe");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            Files.delete(filePath);
            
            response.put("success", true);
            response.put("message", "Archivo eliminado correctamente");
            
            log.info("Foto de empleado eliminada: {}", fileName);
            
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("Error al eliminar la foto del empleado: {}", fileName, e);
            response.put("error", "Error al eliminar el archivo");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}