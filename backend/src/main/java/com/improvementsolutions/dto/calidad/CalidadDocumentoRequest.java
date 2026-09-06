package com.improvementsolutions.dto.calidad;

import lombok.Data;

@Data
public class CalidadDocumentoRequest {
    private Long parentId;
    private Long procesoCatalogItemId;
    private Long tipoCatalogItemId;
    /** Snapshot opcional si el FE ya resolvió códigos. */
    private String procesoName;
    private String procesoCode;
    private String tipoName;
    private String tipoCode;
    private String nombre;
    private String fechaElaboracion;
    private String fechaRevision;
    private String version;
    private String fechaProxRevision;
    private Integer diasVigencia;
    private String estado;
    private String almacenamiento;
    private String responsable;
    private String vigencia;
    private String disposicionFinal;
    private String observaciones;
}
