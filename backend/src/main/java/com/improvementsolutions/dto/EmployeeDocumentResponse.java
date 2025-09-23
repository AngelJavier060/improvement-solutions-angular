package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDocumentResponse {
    private Long id;
    private Long business_employee_id;
    private TypeDocumentRef type_document;
    private LocalDate start_date;
    private LocalDate end_date;
    private String description;
    private Boolean active;
    private List<DocumentFileResponse> files;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TypeDocumentRef {
        private Long id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentFileResponse {
        private Long id;
        private String file; // URL público
        private String file_name;
        private String file_type;
    }
}
