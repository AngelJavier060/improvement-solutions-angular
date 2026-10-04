package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingWorkerDto {
    private Long id;
    private String fullName;
    private String cedula;
    private String position;
    private String photoUrl;
    private String phone;
    private String email;
    private String department;
    private String block;
    private String contractorCompany;
    private String contractType;
    private String hireDate;
    private String bloodType;
    private String iess;
    private String companyCode;
    private int received;
    private int pending;
    private int hoursTotal;
    private List<TrainingReceivedDto> records = new ArrayList<>();
    private List<TrainingPendingTopicDto> pendingTopics = new ArrayList<>();

    @Data
    public static class TrainingReceivedDto {
        private Long sessionId;
        private Long itemId;
        private String topicName;
        private String sessionDate;
        private String place;
        private String facilitator;
        private Integer hours;
        private String evidenceUrl;
        private String origin;
        private String activityType;
        private String methodology;
    }

    @Data
    public static class TrainingPendingTopicDto {
        private Long itemId;
        private String topicName;
        private String audienceLabel;
    }
}
