package com.improvementsolutions.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class EmployeeMovementRequestDto {
    private String reason;          // Motivo (opcional para reingreso)
    private LocalDate effectiveDate; // Fecha efectiva (obligatoria)
}
