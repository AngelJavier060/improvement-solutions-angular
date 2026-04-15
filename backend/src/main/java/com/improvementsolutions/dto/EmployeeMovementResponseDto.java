package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Movimiento laboral (salida/reingreso) persistido en {@code employee_movements}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeMovementResponseDto {
    private Long id;
    /** {@code DEACTIVATION} o {@code REACTIVATION} */
    private String movementType;
    private LocalDate effectiveDate;
    private String reason;
    private LocalDateTime createdAt;
}
