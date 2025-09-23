package com.improvementsolutions.controller;

import com.improvementsolutions.dto.EmployeeCardResponse;
import com.improvementsolutions.service.BusinessEmployeeCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@Slf4j
public class EmployeeCardController {

    private final BusinessEmployeeCardService cardService;

    @GetMapping("/employee_card/by-business-employee/{id}")
    public ResponseEntity<List<EmployeeCardResponse>> getByBusinessEmployee(@PathVariable("id") Long businessEmployeeId) {
        try {
            return ResponseEntity.ok(cardService.getByBusinessEmployeeId(businessEmployeeId));
        } catch (Exception e) {
            log.error("Error obteniendo tarjetas por businessEmployeeId {}: {}", businessEmployeeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(value = "/employee_card", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createEmployeeCard(
            @RequestParam("business_employee_id") Long businessEmployeeId,
            @RequestParam("card_id") Long cardId,
            @RequestParam(value = "card_number", required = false) String cardNumber,
            @RequestParam(value = "issue_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate issueDate,
            @RequestParam(value = "expiry_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate expiryDate,
            @RequestParam(value = "observations", required = false) String observations,
            @RequestParam(value = "files[]", required = false) MultipartFile[] files
    ) {
        try {
            List<MultipartFile> fileList = files != null ? Arrays.asList(files) : List.of();
            EmployeeCardResponse resp = cardService.create(businessEmployeeId, cardId, cardNumber, issueDate, expiryDate, observations, fileList);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException ex) {
            log.error("Error de validación al crear tarjeta: {}", ex.getMessage(), ex);
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "error", "VALIDATION_ERROR",
                    "message", ex.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error interno al crear tarjeta", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", e.getMessage() != null ? e.getMessage() : "Unexpected error"
            ));
        }
    }

    @DeleteMapping("/employee_card/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            cardService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
