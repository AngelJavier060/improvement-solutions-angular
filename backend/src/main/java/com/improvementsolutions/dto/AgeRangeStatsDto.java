package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgeRangeStatsDto {
    private int under18;     // < 18 años
    private int from19To30;  // 19 a 30
    private int from31To50;  // 31 a 50
    private int over50;      // > 50
    private int total;       // total considerados (con fecha de nacimiento válida)
}
