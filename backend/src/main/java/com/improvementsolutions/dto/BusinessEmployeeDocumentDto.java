package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class BusinessEmployeeDocumentDto extends BaseDto {
    private Long businessEmployeeId;
    private Long typeDocumentId;
    private String documentFile;
    private LocalDate expirationDate;
    private String observations;
    
    // Referencias para presentación
    private String employeeFullName;
    private String typeDocumentName;
}
