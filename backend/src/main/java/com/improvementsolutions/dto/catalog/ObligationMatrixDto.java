package com.improvementsolutions.dto.catalog;

import com.improvementsolutions.dto.BaseDto;
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
public class ObligationMatrixDto extends BaseDto {
    private String description;
    private String legalCompliance;
    private String legalRegulation;
    private Long departmentId;
}
