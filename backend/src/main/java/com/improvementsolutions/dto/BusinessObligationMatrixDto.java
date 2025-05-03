package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class BusinessObligationMatrixDto extends BaseDto {
    private Long businessId;
    private Long obligationMatrixId;
    private String name;
    private String description;
    private LocalDate dueDate;
    private Boolean completed;
    private String observations;
    private List<BusinessObligationMatrixFileDto> files;
    
    // Referencias para presentación
    private String businessName;
    private String obligationMatrixName;
}