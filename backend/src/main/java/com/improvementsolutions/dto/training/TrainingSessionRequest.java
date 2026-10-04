package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingSessionRequest {
    private Long itemId;
    private String sessionDate;
    private String place;
    private Integer hours;
    private String facilitator;
    private String notes;
    private List<AttendanceRow> attendees = new ArrayList<>();

    @Data
    public static class AttendanceRow {
        private Long employeeId;
        private Boolean present;
        private String score;
    }
}
