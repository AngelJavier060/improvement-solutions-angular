package com.improvementsolutions.storage;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import com.improvementsolutions.service.FileUrlService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class FileUrlHelperTest {

    @Test
    public void testGetUrl() {
        // Crear mock para FileUrlService
        FileUrlService fileUrlService = Mockito.mock(FileUrlService.class);
        
        // Crear una instancia del objeto a probar
        FileUrlHelper fileUrlHelper = new FileUrlHelper(fileUrlService);
        
        // Definir comportamiento esperado
        String filename = "test.jpg";
        String expectedUrl = "http://localhost:8080/api/files/test.jpg";
        when(fileUrlService.getUrl(filename)).thenReturn(expectedUrl);
        
        // Ejecutar método a probar
        String result = fileUrlHelper.getUrl(filename);
        
        // Verificar resultado
        assertEquals(expectedUrl, result);
    }
}