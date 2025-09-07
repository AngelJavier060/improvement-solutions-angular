package com.improvementsolutions.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileSystemStorageService implements StorageService {
    private static final Logger logger = LoggerFactory.getLogger(FileSystemStorageService.class);
    private final Path rootLocation;
    private static final String LOGOS_DIRECTORY = "logos";
    
    @Value("${app.storage.logos.maxsize:2MB}")
    private String maxLogoSize;
    
    @Value("${app.storage.logos.allowed-types:image/jpeg,image/png,image/gif}")
    private String allowedLogoTypes;

    public FileSystemStorageService(@Value("${app.storage.location:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        logger.info("Storage service initialized with root location: {}", this.rootLocation);
    }    @PostConstruct
    @Override
    public void init() {
        try {
            logger.info("⭐ Inicializando sistema de almacenamiento...");
            
            // Crear directorios necesarios en una sola operación
            Path logosDir = rootLocation.resolve(LOGOS_DIRECTORY);
            Files.createDirectories(rootLocation);
            Files.createDirectories(logosDir);
            
            // Asegurar permisos adecuados
            try {
                // Intentar establecer permisos POSIX si es posible
                Set<PosixFilePermission> permissions = PosixFilePermissions.fromString("rwxrwxr-x");
                Files.setPosixFilePermissions(rootLocation, permissions);
                Files.setPosixFilePermissions(logosDir, permissions);
                logger.info("✅ Permisos POSIX establecidos correctamente");
            } catch (UnsupportedOperationException e) {
                // En Windows, intentar establecer los permisos básicos
                rootLocation.toFile().setWritable(true, false);
                logosDir.toFile().setWritable(true, false);
                
                // Verificar permisos
                if (!Files.isWritable(rootLocation) || !Files.isWritable(logosDir)) {
                    throw new StorageException("Permisos insuficientes en los directorios de almacenamiento");
                }
            }
            
            logger.info("Sistema de almacenamiento inicializado correctamente en: {}", rootLocation);
        } catch (IOException e) {
            throw new StorageException("Error al inicializar el sistema de almacenamiento: " + e.getMessage(), e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new StorageException("No se puede almacenar un archivo vacío.");
            }

            String originalFilename = file.getOriginalFilename();
            String filename = StringUtils.cleanPath(originalFilename != null ? originalFilename : "unnamed");
            String newFilename = generateUniqueFilename(filename);

            if (filename.contains("..")) {
                throw new StorageException(
                    "No se permite almacenar archivos con rutas relativas");
            }

            Path destinationFile = this.rootLocation.resolve(newFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
                return newFilename;
            }
        } catch (IOException e) {
            throw new StorageException("Error al almacenar el archivo: " + e.getMessage(), e);
        }
    }

    @Override
    public String store(String directory, MultipartFile file, String fileName) throws IOException {
        if (file.isEmpty()) {
            throw new StorageException("No se puede almacenar un archivo vacío.");
        }

        // Validación específica para logos
        if (LOGOS_DIRECTORY.equals(directory)) {
            validateLogoFile(file);
        }

        // Generar nombre de archivo si no se proporciona uno
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = generateUniqueFilename(file.getOriginalFilename());
        }

        // Limpiar y normalizar rutas una sola vez
        String cleanDirectory = StringUtils.cleanPath(directory);
        String cleanFileName = StringUtils.cleanPath(fileName);
        
        if (cleanFileName.contains("..") || cleanDirectory.contains("..")) {
            throw new StorageException("No se permite la navegación de directorios maliciosa");
        }

        try {
            // Preparar directorio destino
            Path directoryPath = this.rootLocation.resolve(cleanDirectory);
            
            // Crear directorio si no existe
            Files.createDirectories(directoryPath);

            // Verificar permisos del directorio
            if (!Files.isWritable(directoryPath)) {
                throw new StorageException("Permisos insuficientes en el directorio: " + cleanDirectory);
            }

            // Preparar y validar archivo destino
            Path destinationFile = directoryPath.resolve(cleanFileName);
            
            // Almacenar archivo
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
                logger.info("Archivo almacenado exitosamente en: {}", destinationFile);
                return cleanDirectory + "/" + cleanFileName;
            }
        } catch (IOException e) {
            throw new StorageException("Error al almacenar el archivo: " + e.getMessage(), e);
        }
    }

    @Override
    public Stream<Path> loadAll() {
        try {
            return Files.walk(this.rootLocation, 1)
                    .filter(path -> !path.equals(this.rootLocation))
                    .map(this.rootLocation::relativize);
        } catch (IOException e) {
            throw new StorageException("Error al leer archivos almacenados", e);
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
                throw new StorageFileNotFoundException("No se pudo encontrar el archivo: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageException("No se pudo leer el archivo: " + filename, e);
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
                throw new StorageFileNotFoundException("No se pudo encontrar el archivo: " + directory + "/" + filename);
            }
        } catch (MalformedURLException e) {
            throw new StorageException("No se pudo leer el archivo: " + directory + "/" + filename, e);
        }
    }

    @Override
    public URL generatePresignedUrl(String key, Date expiration) {
        try {
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

    private String generateUniqueFilename(String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    private void validateLogoFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new StorageException("Tipo de archivo no detectado");
        }

        // Validar tipo de archivo usando la lista de tipos permitidos
        boolean isValidType = Arrays.stream(allowedLogoTypes.split(","))
            .map(String::trim)
            .anyMatch(allowedType -> contentType.equalsIgnoreCase(allowedType));
            
        if (!isValidType) {
            throw new StorageException("Tipo de archivo no permitido. Tipos permitidos: " + allowedLogoTypes);
        }
        
        // Validar tamaño usando la configuración
        long maxSize = DataSize.parse(maxLogoSize).toBytes();
        if (file.getSize() > maxSize) {
            throw new StorageException(String.format("El tamaño del logo no debe exceder %s", maxLogoSize));
        }
    }
}
