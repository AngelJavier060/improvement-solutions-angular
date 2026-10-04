package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingSessionDto {
    private Long id;
    private Long itemId;
    private String topicName;
    private String sessionDate;
    private String place;
    private Integer hours;
    private String facilitator;
    private int presentCount;
    private String createdBy;
    private String evidenceUrl;
    private List<String> evidencePhotoUrls = new ArrayList<>();
    private String origin;
    private boolean reinduction;
    private List<TrainingPersonDto> attendees = new ArrayList<>();
}
