package com.improvementsolutions.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.util.Date;
import java.util.stream.Stream;

public interface StorageService {

    void init();

    /**
     * Almacena un archivo en la ubicación predeterminada
     */
    String store(MultipartFile file) throws IOException;

    /**
     * Almacena un archivo en una carpeta específica
     */
    String store(String directory, MultipartFile file, String fileName) throws IOException;

    /**
     * Lista todos los archivos almacenados
     */
    Stream<Path> loadAll();

    /**
     * Carga un archivo por su nombre
     */
    Path load(String filename);

    /**
     * Carga un archivo desde una carpeta específica
     */
    Path load(String directory, String filename);

    /**
     * Carga un archivo como un recurso de Spring
     */
    Resource loadAsResource(String filename);

    /**
     * Carga un archivo de una carpeta específica como un recurso de Spring
     */
    Resource loadAsResource(String directory, String filename);

    /**
     * Genera una URL temporal para acceder a un archivo
     */
    URL generatePresignedUrl(String key, Date expiration);

    /**
     * Elimina un archivo
     */
    void delete(String key) throws IOException;

    /**
     * Elimina un archivo de una carpeta específica
     */
    void delete(String directory, String filename) throws IOException;

    /**
     * Elimina todos los archivos
     */
    void deleteAll();

    /**
     * Verifica si un archivo existe
     */
    boolean exists(String key);
}