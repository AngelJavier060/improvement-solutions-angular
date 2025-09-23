package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeCardResponse {
    private Long id;
    private Long business_employee_id;
    private CardRef card;
    private String card_number;
    private LocalDate issue_date;
    private LocalDate expiry_date;
    private String observations;
    private Boolean active;
    private List<CardFileResponse> files;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardRef {
        private Long id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardFileResponse {
        private Long id;
        private String file;
        private String file_name;
        private String file_type;
    }
}
