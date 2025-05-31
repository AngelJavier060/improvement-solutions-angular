package com.improvementsolutions.storage;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.util.Date;
import java.util.stream.Stream;

@Service
public class TestStorageService implements StorageService {

    private final Resource testResource;
    private final String testFilename = "test.txt";
    private final String contentType = "text/plain";
    private final byte[] testContent = "Test file content".getBytes();

    public TestStorageService() {
        this.testResource = new ClassPathResource("test-files/" + testFilename);
    }

    @Override
    public void init() {
        // No-op para pruebas
    }    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new StorageException("Failed to store empty file");
        }
        return testFilename;
    }

    @Override
    public String store(String directory, MultipartFile file, String fileName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new StorageException("Failed to store empty file");
        }
        return directory + "/" + (fileName != null ? fileName : testFilename);
    }

    @Override
    public Stream<Path> loadAll() {
        return Stream.empty(); // No necesario para pruebas
    }

    @Override
    public Path load(String filename) {
        return Path.of(filename);
    }    @Override
    public Resource loadAsResource(String filename) {
        if (filename.equals(testFilename)) {
            return new TestResource(testContent, filename, contentType);
        }
        throw new StorageFileNotFoundException("File not found: " + filename);
    }

    @Override
    public Resource loadAsResource(String directory, String filename) {
        if (filename.equals(testFilename)) {
            return testResource;
        }
        throw new StorageException("Archivo no encontrado: " + directory + "/" + filename);
    }

    @Override
    public URL generatePresignedUrl(String key, Date expiration) {
        throw new UnsupportedOperationException("No implementado en pruebas");
    }

    @Override
    public void delete(String key) throws IOException {
        if (!key.equals(testFilename)) {
            throw new StorageException("Archivo no encontrado: " + key);
        }
    }

    @Override
    public void delete(String directory, String filename) throws IOException {
        if (!filename.equals(testFilename)) {
            throw new StorageException("Archivo no encontrado: " + directory + "/" + filename);
        }
    }

    @Override
    public void deleteAll() {
        // No-op para pruebas
    }

    @Override
    public boolean exists(String key) {
        return key.equals(testFilename);
    }
}
