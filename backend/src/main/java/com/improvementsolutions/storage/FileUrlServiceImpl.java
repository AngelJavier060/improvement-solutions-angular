package com.improvementsolutions.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Implementación del servicio para manejar URLs de archivos
 */
@Service
public class FileUrlServiceImpl implements FileUrlService {
    
    @Value("${app.file.base-url:http://localhost:8080/api/files/}")
    private String baseUrl;
    
    @Override
    public String getUrl(String filename) {
        return baseUrl + filename;
    }
}
