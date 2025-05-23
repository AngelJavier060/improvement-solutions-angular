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
public class BusinessObligationMatrixFileDto extends BaseDto {
    private Long businessObligationMatrixId;
    private String fileName;
    private String filePath;
    private String fileType;
    private String description;
}
