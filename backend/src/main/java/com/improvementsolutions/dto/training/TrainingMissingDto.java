package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingMissingDto {
    private Long itemId;
    private String topicName;
    private String audienceLabel;
    private int obligated;
    private int trained;
    private int missing;
    private List<TrainingPersonDto> people = new ArrayList<>();
}
