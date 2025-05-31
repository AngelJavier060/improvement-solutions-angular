package com.improvementsolutions.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.improvementsolutions.storage.StorageException;
import com.improvementsolutions.storage.StorageFileNotFoundException;

import lombok.AllArgsConstructor;
import lombok.Data;

@ControllerAdvice
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
    }    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        logger.error("❌ Archivo excede el tamaño máximo: {}", exc.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse(
                    "Archivo demasiado grande",
                    "El archivo excede el tamaño máximo permitido",
                    "MAX_SIZE_EXCEEDED"
                ));
    }    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception exc) {
        logger.error("❌ Error interno del servidor: {}", exc.getMessage(), exc);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(
                    "Error interno del servidor",
                    "Se produjo un error al procesar la solicitud",
                    "INTERNAL_ERROR"
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
