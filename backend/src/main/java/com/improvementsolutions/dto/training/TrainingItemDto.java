package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingItemDto {
    private Long id;
    private String name;
    private String description;
    private String activityType;
    private String facilitatorType;
    private String facilitator;
    private String place;
    private String evidencePdfUrl;
    private List<String> evidencePhotoUrls = new ArrayList<>();
    private String materials;
    private String audienceCode;
    private String audienceLabel;
    private List<Integer> months = new ArrayList<>();
    private String duration;
    private String methodology;
    private Integer plannedCount;
    private String origin;
    private int obligated;
    private int trained;
    private int missing;
    private int percent;
    private int sessions;
    private boolean overdue;
}
