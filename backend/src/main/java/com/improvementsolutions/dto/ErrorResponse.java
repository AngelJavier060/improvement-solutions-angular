package com.improvementsolutions.dto;

public class ErrorResponse {
    private String message;
    private String error;
    private int status;

    public ErrorResponse() {
    }

    public ErrorResponse(String message) {
        this.message = message;
        this.error = "Error";
        this.status = 400;
    }

    public ErrorResponse(String message, String error, int status) {
        this.message = message;
        this.error = error;
        this.status = status;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
}
