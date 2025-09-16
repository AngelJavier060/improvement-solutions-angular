package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ContractorBlockDto extends BaseDto {
    private String name;
    private String code;
    private String description;
    
    // Información de la empresa contratista
    private Long contractorCompanyId;
    private String contractorCompanyName;
    
    // Información estadística
    private Long totalEmployees;
    
    // Método de utilidad
    public String getFullName() {
        if (contractorCompanyName != null) {
            return contractorCompanyName + " - " + this.name;
        }
        return this.name;
    }
}