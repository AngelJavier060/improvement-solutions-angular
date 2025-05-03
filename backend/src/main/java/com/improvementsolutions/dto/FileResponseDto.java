package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileResponseDto {
    
    /**
     * URL permanente o clave del archivo
     */
    private String url;
    
    /**
     * URL temporal prefirmada para acceso público
     */
    private String temporaryUrl;
    
    /**
     * Nombre del archivo
     */
    private String filename;
    
    /**
     * Tipo de contenido
     */
    private String contentType;
    
    /**
     * Tamaño del archivo en bytes
     */
    private Long size;
}