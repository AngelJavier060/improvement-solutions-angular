package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeCourseResponse {
    private Long id;
    private Long business_employee_id;
    private CourseRef course;
    private LocalDate issue_date;
    private LocalDate expiry_date;
    private Integer hours;
    private String score;
    private String observations;
    private Boolean active;
    private List<CourseFileResponse> files;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseRef {
        private Long id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseFileResponse {
        private Long id;
        private String file;
        private String file_name;
        private String file_type;
    }
}
