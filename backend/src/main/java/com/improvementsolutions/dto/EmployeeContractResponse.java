package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeContractResponse {
    private Long id;
    private Long business_employee_id;
    private Ref type_contract;
    private Ref position;
    private Ref department;
    private LocalDate start_date;
    private LocalDate end_date;
    private BigDecimal salary;
    private String description;
    private List<ContractFileResponse> files;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Ref {
        private Long id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContractFileResponse {
        private Long id;
        private String file; // public URL
        private String file_name;
        private String file_type;
    }
}
