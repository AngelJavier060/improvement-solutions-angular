package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ContractorCompanyDto extends BaseDto {
    private String name;
    private String code;
    private String description;
    
    // Lista de bloques asociados (para mostrar en el frontend)
    private List<ContractorBlockDto> blocks;
    
    // Información estadística
    private Long totalEmployees;
    private Long totalBlocks;
}