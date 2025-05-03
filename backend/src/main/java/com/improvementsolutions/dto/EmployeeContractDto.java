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
public class EmployeeContractDto extends BaseDto {
    private Long employeeId;
    private String contractCode;
    private Long typeContractId;
    private Long positionId;
    private Long departmentId;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal salary;
    private Boolean active;
    
    // Referencias para presentación
    private String employeeName;
    private String typeContractName;
    private String positionName;
    private String departmentName;
}