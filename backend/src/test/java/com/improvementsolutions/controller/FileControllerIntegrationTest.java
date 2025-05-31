package com.improvementsolutions.controller;

import com.improvementsolutions.config.TestDataInitializer;
import com.improvementsolutions.config.TestStorageConfig;
import com.improvementsolutions.dto.auth.LoginRequestDto;
import com.improvementsolutions.dto.auth.LoginResponseDto;
import com.improvementsolutions.service.AuthService;
import com.improvementsolutions.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;

import static org.hamcrest.Matchers.containsString;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestStorageConfig.class)
class FileControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;    @Autowired
    private StorageService storageService;
    
    @Autowired
    private AuthService authService;

    @Autowired
    private TestDataInitializer testDataInitializer;
    
    private String authToken;
    private int testId;
    
    @BeforeEach
    void setUp() throws IOException {
        // Limpiar y reinicializar los datos de prueba, obteniendo el ID actual
        testId = testDataInitializer.initializeTestData();
        
        // Obtener token de autenticación
        LoginRequestDto loginRequest = new LoginRequestDto();
        loginRequest.setUsername("admin_test_" + testId);
        loginRequest.setPassword("admin_password");
        
        LoginResponseDto response = authService.authenticateUser(loginRequest, "Test Device", "127.0.0.1");
        authToken = "Bearer " + response.getToken();
    }

    @Test
    void shouldUploadFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test.txt",
            MediaType.TEXT_PLAIN_VALUE,
            "Hello, World!".getBytes()
        );

        mockMvc.perform(multipart("/api/files/upload")
            .file(file)
            .header(HttpHeaders.AUTHORIZATION, authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value(containsString("successfully")));
    }

    @Test
    void shouldDownloadFile() throws Exception {
        mockMvc.perform(get("/api/files/download/{filename}", "test.txt")
            .header(HttpHeaders.AUTHORIZATION, authToken))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                containsString("attachment; filename=\"test.txt\"")));
    }

    @Test
    void shouldDeleteFileFromDirectory() throws Exception {
        mockMvc.perform(delete("/api/files/delete/{filename}", "test.txt")
            .header(HttpHeaders.AUTHORIZATION, authToken))
            .andExpect(status().isOk());
    }

    @Test
    void shouldFailUploadWithoutFile() throws Exception {
        mockMvc.perform(multipart("/api/files/upload")
            .header(HttpHeaders.AUTHORIZATION, authToken))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldFailWithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/files/download/{filename}", "test.txt")
            .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.token.here"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldFailWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/files/download/{filename}", "test.txt"))
            .andExpect(status().isUnauthorized());
    }    @Test
    void shouldReturnNotFoundForNonExistentFile() throws Exception {

        mockMvc.perform(get("/api/files/download/{filename}", "nonexistent.txt")
            .header(HttpHeaders.AUTHORIZATION, authToken))
            .andExpect(status().isNotFound());
    }
}