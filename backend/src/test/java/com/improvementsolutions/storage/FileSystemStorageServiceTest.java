package com.improvementsolutions.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileSystemStorageServiceTest {

    private FileSystemStorageService storageService;
    
    @TempDir
    Path tempDir;
    
    @BeforeEach
    void setUp() {
        storageService = new FileSystemStorageService(tempDir.toString());
        storageService.init();
    }
    
    @AfterEach
    void tearDown() {
        storageService.deleteAll();
    }

    @Test
    void shouldSaveUploadedFile() throws IOException {
        // Arrange
        MockMultipartFile multipartFile = new MockMultipartFile("file", 
            "test.txt", "text/plain", "Test content".getBytes());
            
        // Act
        String storedFileName = storageService.store(multipartFile);
        
        // Assert
        assertThat(storedFileName).isNotNull();
        Path savedPath = tempDir.resolve(storedFileName);
        assertThat(Files.exists(savedPath)).isTrue();
        assertThat(Files.readString(savedPath)).isEqualTo("Test content");
    }

    @Test
    void shouldSaveUploadedFileInDirectory() throws IOException {
        // Arrange
        MockMultipartFile multipartFile = new MockMultipartFile("file", 
            "test.txt", "text/plain", "Test content".getBytes());
        String directory = "testdir";
        String fileName = "testfile.txt";
            
        // Act
        String path = storageService.store(directory, multipartFile, fileName);
        
        // Assert
        assertThat(path).isEqualTo(directory + "/" + fileName);
        Path savedPath = tempDir.resolve(directory).resolve(fileName);
        assertThat(Files.exists(savedPath)).isTrue();
        assertThat(Files.readString(savedPath)).isEqualTo("Test content");
    }
    
    @Test
    void shouldLoadResource() throws IOException {
        // Arrange
        String fileName = "test-resource.txt";
        Path filePath = tempDir.resolve(fileName);
        Files.writeString(filePath, "Test content");
        
        // Act
        Resource resource = storageService.loadAsResource(fileName);
        
        // Assert
        assertThat(resource.exists()).isTrue();
        assertThat(resource.isReadable()).isTrue();
        assertThat(resource.getFilename()).isEqualTo(fileName);
    }

    @Test
    void shouldLoadResourceFromDirectory() throws IOException {
        // Arrange
        String directory = "testdir";
        String fileName = "test-resource.txt";
        Path dirPath = tempDir.resolve(directory);
        Files.createDirectories(dirPath);
        Path filePath = dirPath.resolve(fileName);
        Files.writeString(filePath, "Test content");
        
        // Act
        Resource resource = storageService.loadAsResource(directory, fileName);
        
        // Assert
        assertThat(resource.exists()).isTrue();
        assertThat(resource.isReadable()).isTrue();
        assertThat(resource.getFilename()).isEqualTo(fileName);
    }
    
    @Test
    void shouldGeneratePresignedUrl() {
        // Arrange
        String fileName = "test-resource.txt";
        
        // Act
        java.net.URL url = storageService.generatePresignedUrl(fileName, new Date());
        
        // Assert
        assertThat(url).isNotNull();
        assertThat(url.getPath()).contains(fileName);
    }
    
    @Test
    void shouldDeleteFile() throws IOException {
        // Arrange
        String fileName = "file-to-delete.txt";
        Path filePath = tempDir.resolve(fileName);
        Files.writeString(filePath, "Test content");
        assertThat(Files.exists(filePath)).isTrue();
        
        // Act
        storageService.delete(fileName);
        
        // Assert
        assertThat(Files.exists(filePath)).isFalse();
    }
    
    @Test
    void shouldThrowExceptionWhenFileNotFound() {
        // Arrange
        String fileName = "non-existent-file.txt";
        
        // Act & Assert
        assertThatThrownBy(() -> {
            storageService.loadAsResource(fileName);
        }).isInstanceOf(StorageFileNotFoundException.class);
    }
}