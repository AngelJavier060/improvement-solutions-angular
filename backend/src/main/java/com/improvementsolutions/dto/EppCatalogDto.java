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
public class EppCatalogDto extends BaseDto {
    private String name;
    /** Código corto 2–4 caracteres (ej. EPP, CAS). */
    private String code;
    private String description;
}
