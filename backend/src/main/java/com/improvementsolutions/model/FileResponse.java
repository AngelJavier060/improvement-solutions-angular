package com.improvementsolutions.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileResponse {
    private String url;
    private String temporaryUrl;
    private String filename;
    private String contentType;
    private Long size;
    private String error;
    private boolean success;

    // Constructor para respuesta exitosa
    public FileResponse(String url, String temporaryUrl, String filename, String contentType, Long size) {
        this.url = url;
        this.temporaryUrl = temporaryUrl;
        this.filename = filename;
        this.contentType = contentType;
        this.size = size;
        this.success = true;
    }

    // Constructor para respuesta de error
    public FileResponse(String error) {
        this.error = error;
        this.success = false;
    }
}
