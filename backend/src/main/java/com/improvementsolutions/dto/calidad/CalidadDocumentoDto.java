package com.improvementsolutions.dto.calidad;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CalidadDocumentoDto {
    private Long id;
    private Long parentId;
    private Long procesoCatalogItemId;
    private String procesoName;
    private String procesoCode;
    private Long tipoCatalogItemId;
    private String tipoName;
    private String tipoCode;
    private String codigo;
    private String nombre;
    private LocalDate fechaElaboracion;
    private LocalDate fechaRevision;
    private String version;
    private LocalDate fechaProxRevision;
    private Integer diasVigencia;
    private String estado;
    private String almacenamiento;
    private String responsable;
    private String vigencia;
    private String disposicionFinal;
    private String observaciones;
    private String fileName;
    private String filePath;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
