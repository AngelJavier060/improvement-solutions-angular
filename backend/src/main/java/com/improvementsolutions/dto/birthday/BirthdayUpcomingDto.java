package com.improvementsolutions.dto.birthday;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BirthdayUpcomingDto {
    private boolean enabled;
    private boolean mailConfigured;
    private String companyName;
    private String message;
    private List<BirthdayUpcomingItemDto> items = new ArrayList<>();
    private String info;
}
