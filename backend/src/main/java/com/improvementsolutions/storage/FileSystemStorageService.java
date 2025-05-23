package com.improvementsolutions.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Date;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileSystemStorageService implements StorageService {

    private final Path rootLocation;

    public FileSystemStorageService(@Value("${app.storage.location:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir);
    }

    @Override
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new StorageException("No se pudo inicializar el directorio de almacenamiento", e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new StorageException("No se puede almacenar un archivo vacío.");
            }
            
            // Generar un nombre único para el archivo
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String filename = UUID.randomUUID().toString() + extension;
            
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, this.rootLocation.resolve(filename),
                    StandardCopyOption.REPLACE_EXISTING);
            }
            return filename;
        } catch (IOException e) {
            throw new StorageException("Error al almacenar el archivo.", e);
        }
    }

    @Override
    public String store(String directory, MultipartFile file, String fileName) throws IOException {
        Path directoryPath = this.rootLocation.resolve(directory);
        Files.createDirectories(directoryPath);
        
        try (InputStream inputStream = file.getInputStream()) {
            Path filePath = directoryPath.resolve(fileName);
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
            return directory + "/" + fileName;
        }
    }

    @Override
    public Stream<Path> loadAll() {
        try {
            return Files.walk(this.rootLocation, 1)
                .filter(path -> !path.equals(this.rootLocation))
                .map(this.rootLocation::relativize);
        } catch (IOException e) {
            throw new StorageException("Error al leer los archivos almacenados", e);
        }
    }

    @Override
    public Path load(String filename) {
        return rootLocation.resolve(filename);
    }

    @Override
    public Resource loadAsResource(String filename) {
        try {
            Path file = load(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new StorageFileNotFoundException(
                        "No se pudo leer el archivo: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageFileNotFoundException("No se pudo leer el archivo: " + filename, e);
        }
    }

    @Override
    public Resource loadAsResource(String directory, String filename) {
        try {
            Path dirPath = rootLocation.resolve(directory);
            Path file = dirPath.resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new StorageFileNotFoundException(
                        "No se pudo leer el archivo: " + directory + "/" + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageFileNotFoundException("No se pudo leer el archivo: " + directory + "/" + filename, e);
        }
    }

    @Override
    public URL generatePresignedUrl(String key, Date expiration) {
        try {
            // Para almacenamiento local, simplemente devolvemos una URL al archivo
            Path file = rootLocation.resolve(key);
            return file.toUri().toURL();
        } catch (MalformedURLException e) {
            throw new StorageException("No se pudo generar la URL para el archivo: " + key, e);
        }
    }

    @Override
    public void delete(String key) throws IOException {
        Path file = rootLocation.resolve(key);
        Files.deleteIfExists(file);
    }

    @Override
    public void delete(String directory, String filename) throws IOException {
        Path dirPath = rootLocation.resolve(directory);
        Path file = dirPath.resolve(filename);
        Files.deleteIfExists(file);
    }

    @Override
    public void deleteAll() {
        FileSystemUtils.deleteRecursively(rootLocation.toFile());
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(rootLocation.resolve(key));
    }
}
