package com.improvementsolutions.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatsAggregationDto {
    private BusinessStatsItemDto currentBusiness; // opcional, puede venir null
    private List<BusinessStatsItemDto> allBusinesses;
    private EmployeeStatsDto totalCombined;
}
