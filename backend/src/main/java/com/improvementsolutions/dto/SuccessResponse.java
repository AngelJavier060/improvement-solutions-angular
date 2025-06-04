package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SuccessResponse {
    private String message;
    private int status;
    private Object data;

    public SuccessResponse(String message) {
        this.message = message;
        this.status = 200;
        this.data = null;
    }
    
    public SuccessResponse(String message, Object data) {
        this.message = message;
        this.status = 200;
        this.data = data;
    }
}
