package com.improvementsolutions.dto.expiry;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ExpiryAlertConfigDto {
    private boolean enabled = true;
    private List<String> emails = new ArrayList<>();
    private List<Long> userIds = new ArrayList<>();
    private List<Integer> thresholds = new ArrayList<>(List.of(30, 15, 7));
    private boolean fleet = true;
    private boolean personnelDocuments = true;
    private boolean personnelCourses = true;
    private boolean personnelCards = true;
    private boolean personnelContracts = true;
}
