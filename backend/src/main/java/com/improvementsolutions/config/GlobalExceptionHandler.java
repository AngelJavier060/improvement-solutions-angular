package com.improvementsolutions.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.sql.SQLIntegrityConstraintViolationException;
import java.util.HashMap;
import java.util.Map;
import java.io.IOException;

/**
 * Maps common persistence constraint violations to 409 Conflict, so the frontend
 * can handle them gracefully instead of receiving 500.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@ControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Map<String, Object>> conflict(String title, String message, String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("message", message);
        body.put("code", code);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {
        // Try to detect FK or unique constraint issues
        Throwable root = getRootCause(ex);
        if (root instanceof SQLIntegrityConstraintViolationException
                || (root != null && root.getClass().getSimpleName().toLowerCase().contains("constraint"))) {
            return conflict(
                "No se puede completar la operación",
                "La operación viola una restricción de integridad (por ejemplo, está en uso o el nombre ya existe).",
                "DATA_INTEGRITY_CONFLICT");
        }
        return conflict(
            "No se puede completar la operación",
            "La operación viola una restricción de integridad.",
            "DATA_INTEGRITY_CONFLICT");
    }

    @ExceptionHandler(org.hibernate.exception.ConstraintViolationException.class)
    public ResponseEntity<?> handleHibernateConstraint(org.hibernate.exception.ConstraintViolationException ex) {
        return conflict(
            "No se puede completar la operación",
            "La operación viola una restricción de integridad (Hibernate).",
            "CONSTRAINT_VIOLATION");
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<?> handleJakartaConstraint(jakarta.validation.ConstraintViolationException ex) {
        return conflict(
            "Datos inválidos",
            "Hay uno o más campos con valores inválidos.",
            "VALIDATION_ERROR");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxUpload(MaxUploadSizeExceededException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Archivo demasiado grande");
        body.put("message", "El archivo excede el límite permitido (20 MB).");
        body.put("code", "UPLOAD_TOO_LARGE");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<?> handleMultipart(MultipartException ex) {
        Map<String, Object> body = new HashMap<>();
        String msg = ex.getMessage() != null ? ex.getMessage() : "";
        // Algunos servidores envuelven el exceso de tamaño en MultipartException
        if (msg.toLowerCase().contains("size") || msg.toLowerCase().contains("exceed")) {
            body.put("title", "Archivo demasiado grande");
            body.put("message", "El archivo excede el límite permitido (20 MB).");
            body.put("code", "UPLOAD_TOO_LARGE");
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
        }
        body.put("title", "Error al procesar el archivo");
        body.put("message", "No se pudo procesar el contenido enviado. Verifique que sea un archivo válido.");
        body.put("code", "MULTIPART_ERROR");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<?> handleIO(IOException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Error de almacenamiento");
        body.put("message", "No se pudo escribir el archivo en el almacenamiento. Verifique permisos y espacio en disco.");
        body.put("code", "STORAGE_WRITE_ERROR");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private Throwable getRootCause(Throwable t) {
        Throwable result = t;
        while (result.getCause() != null && result.getCause() != result) {
            result = result.getCause();
        }
        return result;
    }
}
