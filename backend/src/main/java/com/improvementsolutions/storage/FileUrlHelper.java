package com.improvementsolutions.storage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Calendar;
import java.util.Date;

/**
 * Utilidad para manejar URLs temporales de archivos
 * Similar a CommonImage en Laravel
 */
@Component
public class FileUrlHelper {
    
    private final StorageService storageService;
    
    @Autowired
    public FileUrlHelper(StorageService storageService) {
        this.storageService = storageService;
    }
    
    /**
     * Genera una URL temporal para un archivo
     * 
     * @param path Ruta del archivo
     * @param minutes Tiempo de expiración en minutos
     * @return URL temporal para acceder al archivo
     */
    public String getTemporaryUrl(String path, int minutes) {
        if (path == null || path.isEmpty()) {
            return null;
        }
        
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.MINUTE, minutes);
        Date expiration = calendar.getTime();
        
        try {
            return storageService.generatePresignedUrl(path, expiration).toString();
        } catch (Exception e) {
            // Si ocurre un error, retornamos null
            return null;
        }
    }
    
    /**
     * Genera una URL temporal para un archivo con un tiempo de expiración predeterminado (5 minutos)
     * 
     * @param path Ruta del archivo
     * @return URL temporal para acceder al archivo
     */
    public String getTemporaryUrl(String path) {
        return getTemporaryUrl(path, 5);
    }
}