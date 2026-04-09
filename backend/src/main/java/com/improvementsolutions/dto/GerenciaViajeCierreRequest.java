package com.improvementsolutions.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class GerenciaViajeCierreRequest {
    private BigDecimal kmFinal;
    private LocalDate fechaCierre;
}
