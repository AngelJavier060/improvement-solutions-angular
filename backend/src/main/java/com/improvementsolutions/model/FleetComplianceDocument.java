package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fleet_compliance_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FleetComplianceDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fleet_vehicle_id", nullable = false)
    @JsonIgnore
    private FleetVehicle fleetVehicle;

    @Column(name = "type_code", nullable = false, length = 100)
    private String typeCode;

    @Column(name = "type_label", nullable = false, length = 255)
    private String typeLabel;

    @Column(name = "doc_category", length = 50)
    private String docCategory;

    @Column(name = "entidad_remitente_id")
    private Long entidadRemitenteId;

    @Column(name = "entidad_remitente_name", length = 255)
    private String entidadRemitenteName;

    @Column(name = "reference_id", length = 120)
    private String referenceId;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "historic_mode", nullable = false)
    @Builder.Default
    private Boolean historicMode = false;

    @Column(name = "file_name", length = 512)
    private String fileName;

    @Column(name = "file_size_label", length = 64)
    private String fileSizeLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fleet_vehicle_document_id")
    @JsonIgnore
    private FleetVehicleDocument fleetVehicleDocument;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.active == null) this.active = true;
        if (this.historicMode == null) this.historicMode = false;
        if (this.docCategory == null || this.docCategory.isBlank()) {
            this.docCategory = "DOCUMENTOS_PRINCIPALES";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
