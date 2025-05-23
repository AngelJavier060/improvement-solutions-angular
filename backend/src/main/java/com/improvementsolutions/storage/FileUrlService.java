package com.improvementsolutions.storage;

/**
 * Servicio para obtener URLs de archivos
 */
public interface FileUrlService {
    
    /**
     * Obtiene la URL completa para un archivo
     * @param filename Nombre del archivo
     * @return URL completa
     */
    String getUrl(String filename);
}
