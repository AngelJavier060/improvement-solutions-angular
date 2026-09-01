package com.improvementsolutions.model.inventory;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.improvementsolutions.model.Business;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cambio_epp_solicitudes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CambioEppSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "n_reporte", nullable = false, length = 40)
    private String nReporte;

    @Column(nullable = false, length = 200)
    private String trabajador;

    @Column(nullable = false, length = 20)
    private String cedula;

    @Column(length = 150)
    private String cargo;

    @Column(length = 200)
    private String area;

    @Column(name = "tipo_acontecimiento", length = 120)
    private String tipoAcontecimiento;

    @Column(name = "section_code", length = 10)
    private String sectionCode;

    @Column(name = "section_label", length = 80)
    private String sectionLabel;

    @Column(name = "estado_epi", length = 120)
    private String estadoEpi;

    @Column(length = 40)
    private String severidad;

    @Column(name = "fecha_elaboracion", length = 40)
    private String fechaElaboracion;

    @Column(nullable = false, length = 40)
    private String status = "PENDIENTE_APROBACION";

    @Column(name = "form_snapshot", columnDefinition = "TEXT")
    private String formSnapshot;

    @Column(name = "signed_file_name", length = 255)
    private String signedFileName;

    @Column(name = "signed_file_path", length = 500)
    private String signedFilePath;

    @Column(name = "signed_uploaded_at")
    private LocalDateTime signedUploadedAt;

    @Column(name = "output_id")
    private Long outputId;

    @Column(name = "output_number", length = 50)
    private String outputNumber;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "rejected_reason", columnDefinition = "TEXT")
    private String rejectedReason;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null || this.status.isBlank()) {
            this.status = "PENDIENTE_APROBACION";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
