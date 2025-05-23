package com.improvementsolutions.storage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.improvementsolutions.service.FileUrlService;

/**
 * Helper para generar URLs para archivos
 */
@Component
public class FileUrlHelper {
    
    private final FileUrlService fileUrlService;
    
    @Autowired
    public FileUrlHelper(FileUrlService fileUrlService) {
        this.fileUrlService = fileUrlService;
    }
    
    /**
     * Obtiene la URL para un archivo
     * @param filename Nombre del archivo
     * @return URL para acceder al archivo
     */
    public String getUrl(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        
        return fileUrlService.getUrl(filename);
    }

    /**
     * Genera una URL temporal para un archivo
     * @param filePath Ruta del archivo
     * @param expirationMinutes Tiempo de expiración en minutos
     * @return URL temporal para acceder al archivo
     */
    public String getTemporaryUrl(String filePath, int expirationMinutes) {
        if (filePath == null || filePath.isBlank()) {
            return null;
        }
        
        return fileUrlService.generateTemporaryUrl(filePath, expirationMinutes);
    }

    /**
     * Genera una URL temporal para un archivo con tiempo de expiración por defecto
     * @param filePath Ruta del archivo
     * @return URL temporal para acceder al archivo
     */
    public String getTemporaryUrl(String filePath) {
        return getTemporaryUrl(filePath, 30); // 30 minutos por defecto
    }

    /**
     * Obtiene la ruta del archivo a partir de un token temporal
     * @param token Token JWT que contiene la ruta del archivo
     * @return Ruta del archivo o null si el token es inválido
     */
    public String getFilePathFromToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        
        return fileUrlService.getFilePathFromToken(token);
    }
}
