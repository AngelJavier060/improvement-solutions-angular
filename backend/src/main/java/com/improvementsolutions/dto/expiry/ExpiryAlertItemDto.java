package com.improvementsolutions.dto.expiry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryAlertItemDto {
    private String sourceType;
    private Long sourceId;
    private String module;
    private String subject;
    private String document;
    private LocalDate expiryDate;
    private long daysLeft;
    private Integer threshold;
}
