package com.improvementsolutions.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessModuleDto {
    private Long id;
    private Long businessId;
    private String businessName;
    private String businessRuc;
    private Long moduleId;
    private String moduleCode;
    private String moduleName;
    private String moduleDescription;
    private String moduleIcon;
    private String moduleColor;
    private Boolean active;
    private String status;
    private LocalDate startDate;
    private LocalDate expirationDate;
    private String notes;
    private Boolean effectivelyActive;
    // Plan info
    private Long planId;
    private String planName;
    private String planCode;
    private java.math.BigDecimal planPrice;
    private Integer planDurationMonths;
    private String planCurrency;
}
