package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponse {
    private String message;
    private String error;
    private int status;

    public ErrorResponse(String message) {
        this.message = message;
        this.error = "Error";
        this.status = 400;
    }
}
