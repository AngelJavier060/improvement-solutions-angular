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
public class BusinessObligationDto extends BaseDto {
    private Long businessId;
    private String name;
    private String description;
    private LocalDate dueDate;
    private Boolean completed;
    private String documentFile;
    private String institution;
    
    // Referencias para presentación
    private String businessName;
}
