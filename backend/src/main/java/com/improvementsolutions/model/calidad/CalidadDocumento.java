package com.improvementsolutions.model.calidad;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.improvementsolutions.model.Business;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "calidad_documentos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalidadDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "proceso_catalog_item_id")
    private Long procesoCatalogItemId;

    @Column(name = "proceso_name", nullable = false)
    private String procesoName;

    @Column(name = "proceso_code", nullable = false, length = 10)
    private String procesoCode;

    @Column(name = "tipo_catalog_item_id")
    private Long tipoCatalogItemId;

    @Column(name = "tipo_name", nullable = false)
    private String tipoName;

    @Column(name = "tipo_code", nullable = false, length = 10)
    private String tipoCode;

    @Column(nullable = false, length = 100)
    private String codigo;

    @Column(nullable = false, length = 500)
    private String nombre;

    @Column(name = "fecha_elaboracion")
    private LocalDate fechaElaboracion;

    @Column(name = "fecha_revision")
    private LocalDate fechaRevision;

    @Column(nullable = false, length = 20)
    private String version = "01";

    @Column(name = "fecha_prox_revision")
    private LocalDate fechaProxRevision;

    @Column(name = "dias_vigencia")
    private Integer diasVigencia;

    @Column(nullable = false, length = 40)
    private String estado = "VIGENTE";

    @Column(length = 255)
    private String almacenamiento;

    @Column(length = 255)
    private String responsable;

    @Column(length = 40)
    private String vigencia;

    @Column(name = "disposicion_final", length = 255)
    private String disposicionFinal;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.version == null || this.version.isBlank()) {
            this.version = "01";
        }
        if (this.estado == null || this.estado.isBlank()) {
            this.estado = "VIGENTE";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
