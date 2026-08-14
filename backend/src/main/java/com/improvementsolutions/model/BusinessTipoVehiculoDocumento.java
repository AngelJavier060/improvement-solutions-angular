package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Documentos de flota (entidad_remitentes) aplicables a un tipo de vehículo,
 * con alcance por empresa.
 */
@Entity
@Table(
        name = "business_tipo_vehiculo_documento",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_biz_tipo_vehiculo_doc",
                columnNames = {"business_id", "tipo_vehiculo_id", "entidad_remitente_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessTipoVehiculoDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tipo_vehiculo_id", nullable = false)
    private TipoVehiculo tipoVehiculo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "entidad_remitente_id", nullable = false)
    private EntidadRemitente entidadRemitente;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
