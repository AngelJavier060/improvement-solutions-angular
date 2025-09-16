package com.improvementsolutions.improvement_solutions_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponseDto {
    private String message;
    private String error;
    private int status;
    
    public ErrorResponseDto(String message) {
        this.message = message;
    }
    
    public ErrorResponseDto(String message, int status) {
        this.message = message;
        this.status = status;
    }
}