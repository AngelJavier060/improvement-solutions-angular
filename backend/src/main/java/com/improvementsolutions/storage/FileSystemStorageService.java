package com.improvementsolutions.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Date;
import java.util.stream.Stream;

@Service
public class FileSystemStorageService implements StorageService {

    private final Path rootLocation;

    public FileSystemStorageService(@Value("${app.storage.location:uploads}") String storageLocation) {
        if (storageLocation.trim().isEmpty()) {
            throw new StorageException("La ubicación de almacenamiento no puede estar vacía");
        }
        this.rootLocation = Paths.get(storageLocation);
    }

    @Override
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new StorageException("No se pudo inicializar el almacenamiento", e);
        }
    }

    @Override
    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new StorageException("No se puede guardar un archivo vacío");
        }
        
        String originalFilename = file.getOriginalFilename();
        String timestamp = String.valueOf(System.currentTimeMillis());
        String filename = timestamp + "_" + originalFilename;
        
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, this.rootLocation.resolve(filename),
                StandardCopyOption.REPLACE_EXISTING);
            return filename;
        }
    }

    @Override
    public String store(String directory, MultipartFile file, String fileName) throws IOException {
        if (file.isEmpty()) {
            throw new StorageException("No se puede guardar un archivo vacío");
        }
        
        Path directoryPath = this.rootLocation.resolve(directory);
        Files.createDirectories(directoryPath);
        
        try (InputStream inputStream = file.getInputStream()) {
            Path destinationFile = directoryPath.resolve(fileName);
            Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
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
            throw new StorageException("No se pudieron leer los archivos almacenados", e);
        }
    }

    @Override
    public Path load(String filename) {
        return rootLocation.resolve(filename);
    }

    @Override
    public Path load(String directory, String filename) {
        return rootLocation.resolve(directory).resolve(filename);
    }

    @Override
    public Resource loadAsResource(String filename) {
        try {
            Path file = load(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new StorageFileNotFoundException("No se pudo leer el archivo: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageFileNotFoundException("No se pudo leer el archivo: " + filename, e);
        }
    }

    @Override
    public Resource loadAsResource(String directory, String filename) {
        try {
            Path file = load(directory, filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new StorageFileNotFoundException("No se pudo leer el archivo: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageFileNotFoundException("No se pudo leer el archivo: " + filename, e);
        }
    }

    @Override
    public URL generatePresignedUrl(String key, Date expiration) {
        try {
            // En el sistema de archivos local, simplemente devolvemos una URL al archivo
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
        Path file = rootLocation.resolve(directory).resolve(filename);
        Files.deleteIfExists(file);
        
        // Eliminar el directorio si está vacío
        Path dir = rootLocation.resolve(directory);
        if (Files.isDirectory(dir) && Files.list(dir).count() == 0) {
            Files.delete(dir);
        }
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