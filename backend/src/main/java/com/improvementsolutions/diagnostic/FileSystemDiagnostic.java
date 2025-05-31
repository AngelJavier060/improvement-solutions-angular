package com.improvementsolutions.diagnostic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Clase de diagnóstico para verificar el sistema de archivos y detectar problemas
 * con el almacenamiento de archivos en la aplicación.
 */
@Component
public class FileSystemDiagnostic {
    private static final Logger logger = LoggerFactory.getLogger(FileSystemDiagnostic.class);
    
    @Value("${app.storage.location:uploads}")
    private String storageLocation;
    
    @PostConstruct
    public void init() {
        diagnoseFileSystem();
    }
    
    /**
     * Método principal de diagnóstico que verifica las rutas de almacenamiento
     * y reporta problemas encontrados.
     */
    public void diagnoseFileSystem() {
        try {
            logger.info("⭐ INICIANDO DIAGNÓSTICO DEL SISTEMA DE ARCHIVOS ⭐");
            
            // Verificar directorio raíz de almacenamiento
            Path rootPath = Paths.get(storageLocation).toAbsolutePath().normalize();
            
            logger.info("Directorio de almacenamiento configurado: {}", rootPath);
            logger.info("¿El directorio de almacenamiento existe? {}", Files.exists(rootPath));
            logger.info("¿El directorio de almacenamiento es accesible para lectura? {}", Files.isReadable(rootPath));
            logger.info("¿El directorio de almacenamiento es accesible para escritura? {}", Files.isWritable(rootPath));
            
            // Verificar subdirectorio de logos
            Path logosPath = rootPath.resolve("logos");
            
            logger.info("Subdirectorio de logos: {}", logosPath);
            logger.info("¿El directorio de logos existe? {}", Files.exists(logosPath));
            logger.info("¿El directorio de logos es accesible para lectura? {}", Files.isReadable(logosPath));
            logger.info("¿El directorio de logos es accesible para escritura? {}", Files.isWritable(logosPath));
            
            // Listar los logos disponibles
            if (Files.exists(logosPath)) {
                logger.info("Archivos en el directorio de logos:");
                
                Files.list(logosPath).forEach(file -> {
                    try {
                        String permissions = "N/A en Windows";
                        if (!System.getProperty("os.name").toLowerCase().startsWith("windows")) {
                            permissions = Files.getPosixFilePermissions(file).toString();
                        }
                        logger.info(" - {} ({}KB, permisos: {})", 
                            file.getFileName(),
                            Files.size(file) / 1024,
                            permissions);
                    } catch (Exception e) {
                        logger.info(" - {} (Error al obtener detalles: {})", 
                            file.getFileName(), e.getMessage());
                    }
                });
            } else {
                logger.error("❌ El directorio de logos no existe. Se intentará crear...");
                try {
                    Files.createDirectories(logosPath);
                    logger.info("✅ Directorio de logos creado exitosamente");
                } catch (Exception e) {
                    logger.error("❌ Error al crear directorio de logos: {}", e.getMessage());
                }
            }
            
            // Verificar el archivo de logo mencionado en el error
            Path specificLogoPath = logosPath.resolve("080919a1-4e5f-4673-adbd-91c6ca76d9c2.png");
            logger.info("Verificando archivo específico: {}", specificLogoPath);
            logger.info("¿El archivo existe? {}", Files.exists(specificLogoPath));
            
            if (Files.exists(specificLogoPath)) {
                logger.info("Tamaño del archivo: {}KB", Files.size(specificLogoPath) / 1024);
                String specificPermissions = "N/A en Windows";
                if (!System.getProperty("os.name").toLowerCase().startsWith("windows")) {
                    specificPermissions = Files.getPosixFilePermissions(specificLogoPath).toString();
                }
                logger.info("Permisos del archivo: {}", specificPermissions);
            }
            
            logger.info("⭐ DIAGNÓSTICO DEL SISTEMA DE ARCHIVOS COMPLETADO ⭐");
        } catch (Exception e) {
            logger.error("❌ Error durante el diagnóstico del sistema de archivos: {}", e.getMessage(), e);
        }
    }
}
