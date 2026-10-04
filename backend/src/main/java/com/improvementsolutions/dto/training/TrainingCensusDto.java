package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingCensusDto {
    private int headcount;
    private int men;
    private int women;
    private int other;
    private int priority;
    private int direct;
    private int contractor;
    private int trainedPeople;
    private int pendingPeople;
    private int percentPeople;
    private String syncAt;
    private List<TrainingRoleDto> roles = new ArrayList<>();
    private List<TrainingSiteDto> sites = new ArrayList<>();
    private List<TrainingOperatorDto> operators = new ArrayList<>();

    @Data
    public static class TrainingRoleDto {
        private String name;
        private int count;
        private int percent;
        private String icon;
    }

    @Data
    public static class TrainingSiteDto {
        private Long id;
        private String name;
        private int count;
        private String companyName;
    }

    @Data
    public static class TrainingOperatorDto {
        private String name;
        private int count;
    }
}
