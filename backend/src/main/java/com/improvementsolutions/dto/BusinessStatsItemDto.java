package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessStatsItemDto {
    private Long businessId;
    private String businessName;
    private String businessRuc;
    private EmployeeStatsDto stats;
}
