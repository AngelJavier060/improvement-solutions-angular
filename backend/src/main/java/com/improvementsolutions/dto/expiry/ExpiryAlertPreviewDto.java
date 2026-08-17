package com.improvementsolutions.dto.expiry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryAlertPreviewDto {
    private boolean mailConfigured;
    private boolean enabled;
    @Builder.Default
    private List<String> recipients = new ArrayList<>();
    @Builder.Default
    private List<ExpiryAlertItemDto> items = new ArrayList<>();
    private String message;
    private int sentCount;
    private int skippedAlreadySent;
}
