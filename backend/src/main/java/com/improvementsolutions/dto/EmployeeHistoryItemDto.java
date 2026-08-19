package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeHistoryItemDto {
    private Long id;
    private String section;
    private String sectionLabel;
    private Long employeeId;
    private String employeeCedula;
    private String employeeName;
    private String employeeCode;
    private String typeName;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String notes;
    private String extra;
    @Builder.Default
    private List<FileRef> files = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileRef {
        private Long id;
        private String file;
        private String fileName;
        private String fileType;
    }
}
