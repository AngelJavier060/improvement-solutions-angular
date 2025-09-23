package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceSummaryDTO {
    private int total;        // total de obligaciones (Cumplimiento Legal)
    private int completed;    // cuántas están en estado CUMPLIDO/CUMPLIDA
    private double percentage; // (completed * 100.0) / total, 0 si total=0
}
