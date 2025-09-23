package com.improvementsolutions.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeStatsDto {
    private int total;
    private int hombres;
    private int mujeres;
    private int discapacidad;
    private int adolescentes;
}