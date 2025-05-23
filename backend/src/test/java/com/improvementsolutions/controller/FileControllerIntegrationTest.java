package com.improvementsolutions.controller;

import com.improvementsolutions.storage.FileUrlHelper;
import com.improvementsolutions.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FileControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StorageService storageService;
    
    @MockBean
    private FileUrlHelper fileUrlHelper;
    
    private MockMultipartFile testFile;    @BeforeEach
    void setUp() {
        testFile = new MockMultipartFile(
            "file", 
            "test-file.txt",
            MediaType.TEXT_PLAIN_VALUE,
            "Test file content".getBytes()
        );        // Configure default behavior for fileUrlHelper mocks
        given(fileUrlHelper.getTemporaryUrl(anyString())).willReturn("http://example.com/temp-url");
        given(fileUrlHelper.getTemporaryUrl(anyString(), anyInt())).willReturn("http://example.com/temp-url");
    }

    @Test
    void shouldUploadFile() throws Exception {
        // Arrange
        String storedPath = "test-file-123.txt";
        String tempUrl = "http://example.com/temp-url";
        
        given(storageService.store(any())).willReturn(storedPath);
        given(fileUrlHelper.getTemporaryUrl(eq(storedPath), anyInt())).willReturn(tempUrl);
        
        // Act & Assert
        MvcResult result = mockMvc.perform(multipart("/api/files/upload")
                .file(testFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(storedPath))
                .andExpect(jsonPath("$.temporaryUrl").value(tempUrl))
                .andExpect(jsonPath("$.filename").value("test-file.txt"))
                .andReturn();
                
        // Verify JSON can be parsed to our DTO
        String content = result.getResponse().getContentAsString();
        assertThat(content).contains(storedPath);
        assertThat(content).contains(tempUrl);
    }
    
    @Test
    void shouldUploadFileToDirectory() throws Exception {
        // Arrange
        String directory = "testdir";
        String fileName = "timestamped-file.txt";
        String storedPath = directory + "/" + fileName;
        String tempUrl = "http://example.com/temp-url";
        
        given(storageService.store(eq(directory), any(), anyString())).willReturn(storedPath);
        given(fileUrlHelper.getTemporaryUrl(eq(storedPath), anyInt())).willReturn(tempUrl);
        
        // Act & Assert
        mockMvc.perform(multipart("/api/files/upload/{directory}", directory)
                .file(testFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(storedPath))
                .andExpect(jsonPath("$.temporaryUrl").value(tempUrl));
    }
    
    @Test
    void shouldRetrieveFile() throws Exception {
        // Arrange
        String fileName = "test-file.txt";
        Resource mockResource = new ClassPathResource("test-file.txt");
        
        given(storageService.loadAsResource(fileName)).willReturn(mockResource);
        
        // Act & Assert
        mockMvc.perform(get("/api/files/{filename}", fileName))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, 
                        containsString("attachment; filename=\"test-file.txt\"")));
    }
    
    @Test
    void shouldRetrieveFileFromDirectory() throws Exception {
        // Arrange
        String directory = "testdir";
        String fileName = "test-file.txt";
        Resource mockResource = new ClassPathResource("test-file.txt");
        
        given(storageService.loadAsResource(directory, fileName)).willReturn(mockResource);
        
        // Act & Assert
        mockMvc.perform(get("/api/files/{directory}/{filename}", directory, fileName))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, 
                        containsString("attachment; filename=\"test-file.txt\"")));
    }
    
    @Test
    void shouldGenerateTemporaryUrl() throws Exception {
        // Arrange
        String filePath = "testdir/test-file.txt";
        String tempUrl = "http://example.com/temp-url";
        
        given(fileUrlHelper.getTemporaryUrl(eq(filePath), anyInt())).willReturn(tempUrl);
          // Act & Assert
        mockMvc.perform(get("/api/files/temp/{*path}", filePath)
                .param("minutes", "60"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(tempUrl));
    }

    @Test
    void shouldRetrieveFileWithTemporaryToken() throws Exception {
        // Arrange
        String token = "valid-jwt-token";
        String filePath = "testdir/test-file.txt";
        Resource mockResource = new ClassPathResource("test-file.txt");
        
        given(fileUrlHelper.getFilePathFromToken(token)).willReturn(filePath);
        given(storageService.loadAsResource(filePath)).willReturn(mockResource);
        
        // Act & Assert
        mockMvc.perform(get("/api/files/temp")
                .param("token", token))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, 
                        containsString("attachment; filename=\"test-file.txt\"")));
    }
    
    @Test
    void shouldDeleteFile() throws Exception {
        // Arrange
        String fileName = "test-file-to-delete.txt";
        
        doNothing().when(storageService).delete(fileName);
        
        // Act & Assert
        mockMvc.perform(delete("/api/files/{filename}", fileName))
                .andExpect(status().isOk());
    }
    
    @Test
    void shouldDeleteFileFromDirectory() throws Exception {
        // Arrange
        String directory = "testdir";
        String fileName = "test-file-to-delete.txt";
        
        doNothing().when(storageService).delete(directory, fileName);
        
        // Act & Assert
        mockMvc.perform(delete("/api/files/{directory}/{filename}", directory, fileName))
                .andExpect(status().isOk());
    }
}