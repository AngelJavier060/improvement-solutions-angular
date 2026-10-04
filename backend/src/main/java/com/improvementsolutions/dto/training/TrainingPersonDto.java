package com.improvementsolutions.dto.training;

import lombok.Data;

@Data
public class TrainingPersonDto {
    private Long id;
    private String fullName;
    private String cedula;
    private String phone;
    private String email;
    private String position;
    private boolean trained;
}
