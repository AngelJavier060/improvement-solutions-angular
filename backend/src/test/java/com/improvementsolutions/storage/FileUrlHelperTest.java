package com.improvementsolutions.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileUrlHelperTest {

    @Mock
    private StorageService storageService;

    private FileUrlHelper fileUrlHelper;

    @BeforeEach
    void setUp() {
        fileUrlHelper = new FileUrlHelper(storageService);
    }

    @Test
    void shouldReturnNullWhenPathIsNull() {
        // Act
        String url = fileUrlHelper.getTemporaryUrl(null);
        
        // Assert
        assertThat(url).isNull();
    }
    
    @Test
    void shouldReturnNullWhenPathIsEmpty() {
        // Act
        String url = fileUrlHelper.getTemporaryUrl("");
        
        // Assert
        assertThat(url).isNull();
    }
    
    @Test
    void shouldReturnUrlWhenPathIsValid() throws MalformedURLException {
        // Arrange
        String path = "some/path/file.txt";
        String expectedUrl = "http://example.com/file.txt";
        when(storageService.generatePresignedUrl(anyString(), any(Date.class)))
            .thenReturn(new URL(expectedUrl));
        
        // Act
        String url = fileUrlHelper.getTemporaryUrl(path);
        
        // Assert
        assertThat(url).isEqualTo(expectedUrl);
    }
    
    @Test
    void shouldReturnUrlWithCustomExpirationTime() throws MalformedURLException {
        // Arrange
        String path = "some/path/file.txt";
        String expectedUrl = "http://example.com/file.txt";
        when(storageService.generatePresignedUrl(anyString(), any(Date.class)))
            .thenReturn(new URL(expectedUrl));
        
        // Act
        String url = fileUrlHelper.getTemporaryUrl(path, 60);
        
        // Assert
        assertThat(url).isEqualTo(expectedUrl);
    }
    
    @Test
    void shouldReturnNullWhenExceptionIsThrown() throws MalformedURLException {
        // Arrange
        String path = "some/path/file.txt";
        when(storageService.generatePresignedUrl(anyString(), any(Date.class)))
            .thenThrow(new RuntimeException("Error generando URL"));
        
        // Act
        String url = fileUrlHelper.getTemporaryUrl(path);
        
        // Assert
        assertThat(url).isNull();
    }
}