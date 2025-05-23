package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class BusinessEmployeeContractDto extends BaseDto {
    private Long businessEmployeeId;
    private Long typeContractId;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal salary;
    private String workingHours;
    private String contractFile;
    
    // Referencias para presentación
    private String employeeFullName;
    private String typeContractName;
}
