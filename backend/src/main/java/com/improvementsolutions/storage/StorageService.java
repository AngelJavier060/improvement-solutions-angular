package com.improvementsolutions.storage;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.util.Date;
import java.util.stream.Stream;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Servicio para almacenar y recuperar archivos
 */
public interface StorageService {

    /**
     * Inicializa el sistema de almacenamiento
     */
    void init();
    
    /**
     * Guarda un archivo y devuelve su nombre generado
     */
    String store(MultipartFile file);
    
    /**
     * Almacena un archivo en un directorio específico
     */
    String store(String directory, MultipartFile file, String fileName) throws IOException;
    
    /**
     * Obtiene un stream con todos los archivos
     */
    Stream<Path> loadAll();
    
    /**
     * Carga un archivo como Path
     */
    Path load(String filename);
    
    /**
     * Carga un archivo como Resource
     */
    Resource loadAsResource(String filename);
    
    /**
     * Carga un archivo desde un directorio específico como Resource
     */
    Resource loadAsResource(String directory, String filename);
    
    /**
     * Genera una URL prefirmada para acceder al archivo
     */
    URL generatePresignedUrl(String key, Date expiration);
    
    /**
     * Elimina un archivo específico
     */
    void delete(String key) throws IOException;
    
    /**
     * Elimina un archivo desde un directorio específico
     */
    void delete(String directory, String filename) throws IOException;
    
    /**
     * Elimina todos los archivos
     */
    void deleteAll();

    /**
     * Verifica si existe un archivo
     */
    boolean exists(String key);
}
