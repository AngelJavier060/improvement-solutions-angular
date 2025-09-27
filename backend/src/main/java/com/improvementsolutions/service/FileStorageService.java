package com.improvementsolutions.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    @Value("${file.upload-dir:upload}")
    private String uploadDir;

    public String storeFile(MultipartFile file, String subdirectory) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("No se puede guardar un archivo vacío");
        }

        // Nombre original seguro (puede venir null)
        String rawName = file.getOriginalFilename();
        String originalFilename = StringUtils.cleanPath(rawName == null ? "archivo" : rawName);

        if (originalFilename.contains("..")) {
            throw new RuntimeException("El nombre del archivo contiene una ruta no válida " + originalFilename);
        }

        // Extensión
        String fileExtension = "";
        if (originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        } else {
            String ct = file.getContentType();
            if (ct != null) {
                if (ct.equalsIgnoreCase("application/pdf")) {
                    fileExtension = ".pdf";
                } else if (ct.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
                    fileExtension = ".docx";
                } else if (ct.equalsIgnoreCase("application/msword")) {
                    fileExtension = ".doc";
                } else if (ct.equalsIgnoreCase("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
                    fileExtension = ".xlsx";
                } else if (ct.equalsIgnoreCase("application/vnd.ms-excel")) {
                    fileExtension = ".xls";
                }
            }
        }

        String newFilename = UUID.randomUUID().toString() + fileExtension;

        // Crear directorio
        Path targetDirectory = Paths.get(uploadDir).resolve(subdirectory).normalize();
        log.debug("[Storage] uploadDir='{}', subdirectory='{}', targetDirectory='{}'", uploadDir, subdirectory, targetDirectory);
        Files.createDirectories(targetDirectory);

        // Copiar
        Path targetLocation = targetDirectory.resolve(newFilename);
        log.debug("[Storage] targetLocation='{}' (size={} bytes, type='{}')", targetLocation, file.getSize(), file.getContentType());
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return subdirectory + "/" + newFilename;
    }

    public String storeFile(MultipartFile file, String subdirectory, String customFilename) throws IOException {
        // Validar el archivo
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("No se puede guardar un archivo vacío");
        }
        
        // Validar el nombre personalizado
        if (customFilename == null || customFilename.trim().isEmpty()) {
            // Si no se proporciona un nombre personalizado, usar el método estándar
            return storeFile(file, subdirectory);
        }
        
        // Normalizar el nombre personalizado
        String cleanFilename = StringUtils.cleanPath(customFilename);
        
        if (cleanFilename.contains("..")) {
            throw new RuntimeException("El nombre del archivo contiene una ruta no válida " + cleanFilename);
        }
        
        // Crear el directorio si no existe
        Path targetDirectory = Paths.get(uploadDir).resolve(subdirectory).normalize();
        Files.createDirectories(targetDirectory);
        
        // Copiar el archivo al directorio de destino con el nombre personalizado
        Path targetLocation = targetDirectory.resolve(cleanFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        
        return subdirectory + "/" + cleanFilename;
    }

    public Resource loadFileAsResource(String filePath) {
        try {
            Path fileStoragePath = Paths.get(uploadDir).normalize();
            Path file = fileStoragePath.resolve(filePath).normalize();
            Resource resource = new UrlResource(file.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("El archivo no existe o no se puede leer: " + filePath);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("El archivo no existe o no se puede leer: " + filePath, ex);
        }
    }

    public boolean deleteFile(String filePath) {
        try {
            Path fileStoragePath = Paths.get(uploadDir).normalize();
            Path file = fileStoragePath.resolve(filePath).normalize();
            return Files.deleteIfExists(file);
        } catch (IOException ex) {
            throw new RuntimeException("Error al eliminar el archivo: " + filePath, ex);
        }
    }

    public String moveFile(String sourceRelativePath, String destSubdirectory, String finalFilename) {
        try {
            Path storageRoot = Paths.get(uploadDir).normalize();
            Path source = storageRoot.resolve(sourceRelativePath).normalize();
            if (!Files.exists(source)) {
                throw new RuntimeException("El archivo de origen no existe: " + sourceRelativePath);
            }

            // Si no se proporciona nombre final, usar el nombre del archivo de origen
            String targetName = finalFilename;
            if (targetName == null || targetName.trim().isEmpty()) {
                targetName = source.getFileName().toString();
            }

            Path destDir = storageRoot.resolve(destSubdirectory).normalize();
            Files.createDirectories(destDir);
            Path dest = destDir.resolve(targetName);

            Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
            return destSubdirectory + "/" + targetName;
        } catch (IOException e) {
            throw new RuntimeException("No se pudo mover el archivo desde '" + sourceRelativePath + "' a '" + destSubdirectory + "'", e);
        }
    }
}
