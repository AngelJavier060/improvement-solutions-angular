package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fleet_vehicle_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FleetVehicleDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fleet_vehicle_id", nullable = false)
    @JsonIgnore
    private FleetVehicle fleetVehicle;

    @Column(name = "original_filename", nullable = false, length = 512)
    private String originalFilename;

    /** Ruta relativa bajo uploads (ej. fleet/{ruc}/{vehicleId}/docs/archivo.pdf) */
    @Column(name = "stored_path", nullable = false, length = 1024)
    private String storedPath;

    @Column(name = "content_type", length = 200)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
