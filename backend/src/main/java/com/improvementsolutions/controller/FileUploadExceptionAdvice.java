package com.improvementsolutions.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import com.improvementsolutions.storage.StorageException;
import com.improvementsolutions.storage.StorageFileNotFoundException;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.IOException;

@Order(Ordered.LOWEST_PRECEDENCE)
@ControllerAdvice(assignableTypes = { FileController.class })
public class FileUploadExceptionAdvice {
    
    private static final Logger logger = LoggerFactory.getLogger(FileUploadExceptionAdvice.class);
      @ExceptionHandler(StorageException.class)
    public ResponseEntity<?> handleStorageException(StorageException exc) {
        logger.error("❌ Error de almacenamiento: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(
                    "Error al procesar el archivo", 
                    exc.getMessage(),
                    "STORAGE_ERROR"
                ));
    }    @ExceptionHandler(StorageFileNotFoundException.class)
    public ResponseEntity<?> handleNotFound(StorageFileNotFoundException exc) {
        logger.error("❌ Archivo no encontrado: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(
                    "Archivo no encontrado",
                    exc.getMessage(),
                    "FILE_NOT_FOUND"
                ));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        logger.error("❌ Archivo excede el tamaño máximo: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse(
                    "Archivo demasiado grande",
                    "El archivo excede el tamaño máximo permitido",
                    "MAX_SIZE_EXCEEDED"
                ));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<?> handleMultipartException(MultipartException exc) {
        logger.error("❌ Error multipart/form-data: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(
                    "Error al procesar el archivo",
                    "No se pudo procesar el contenido enviado. Verifique que sea un archivo válido.",
                    "MULTIPART_ERROR"
                ));
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<?> handleIOException(IOException exc) {
        logger.error("❌ Error de E/S al almacenar archivo: {}", exc.getMessage(), exc);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(
                    "Error de almacenamiento",
                    "No se pudo escribir el archivo en el almacenamiento. Verifique permisos y espacio en disco.",
                    "STORAGE_WRITE_ERROR"
                ));
    }
    
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException exc) {
        logger.error("❌ Acceso denegado: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(
                    "Acceso denegado",
                    "No tienes permisos para acceder a este recurso",
                    "ACCESS_DENIED"
                ));
    }
    
    @Data
    @AllArgsConstructor
    private static class ErrorResponse {
        private final String title;
        private final String message;
        private final String code;
    }
}
