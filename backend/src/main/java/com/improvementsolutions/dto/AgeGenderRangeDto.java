package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgeGenderRangeDto {
    private String label; // e.g., "< 18", "19 - 25"
    private int women;
    private int men;
}
