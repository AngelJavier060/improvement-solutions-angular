package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fila de historial laboral (salida/reingreso) a nivel empresa.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyEmployeeMovementRowDto {
    private Long id;
    private Long employeeId;
    private String employeeFullName;
    private String cedula;
    private String movementType;
    private LocalDate effectiveDate;
    private String reason;
    private LocalDateTime createdAt;
}
