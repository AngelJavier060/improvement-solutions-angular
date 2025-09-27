package com.improvementsolutions.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.sql.SQLIntegrityConstraintViolationException;
import java.util.HashMap;
import java.util.Map;

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

    private Throwable getRootCause(Throwable t) {
        Throwable result = t;
        while (result.getCause() != null && result.getCause() != result) {
            result = result.getCause();
        }
        return result;
    }
}
