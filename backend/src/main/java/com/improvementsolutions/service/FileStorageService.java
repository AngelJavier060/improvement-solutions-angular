package com.improvementsolutions.service;

import lombok.RequiredArgsConstructor;
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
public class FileStorageService {

    @Value("${file.upload-dir:upload}")
    private String uploadDir;

    public String storeFile(MultipartFile file, String subdirectory) throws IOException {
        // Normalizar el nombre del archivo
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        
        if (originalFilename.contains("..")) {
            throw new RuntimeException("El nombre del archivo contiene una ruta no válida " + originalFilename);
        }
        
        // Generar un nombre de archivo único usando UUID para evitar colisiones
        String fileExtension = "";
        if (originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String newFilename = UUID.randomUUID().toString() + fileExtension;
        
        // Crear el directorio si no existe
        Path targetDirectory = Paths.get(uploadDir).resolve(subdirectory).normalize();
        Files.createDirectories(targetDirectory);
        
        // Copiar el archivo al directorio de destino
        Path targetLocation = targetDirectory.resolve(newFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        
        return subdirectory + "/" + newFilename;
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
}
