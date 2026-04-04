package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Ficha técnica de vehículo de flota por empresa (mantenimiento).
 */
@Entity
@Table(name = "fleet_vehicles", uniqueConstraints = {
    @UniqueConstraint(name = "uk_fleet_vehicle_business_codigo", columnNames = {"business_id", "codigo_equipo"}),
    @UniqueConstraint(name = "uk_fleet_vehicle_business_placa", columnNames = {"business_id", "placa"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FleetVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnore
    private Business business;

    @Column(name = "codigo_equipo", nullable = false, length = 100)
    private String codigoEquipo;

    @Column(nullable = false, length = 30)
    private String placa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clase_vehiculo_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ClaseVehiculo claseVehiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_remitente_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EntidadRemitente entidadRemitente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_vehiculo_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "documentos"})
    private TipoVehiculo tipoVehiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marca_vehiculo_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MarcaVehiculo marcaVehiculo;

    @Column(length = 200)
    private String modelo;

    private Integer anio;

    @Column(name = "serie_chasis", length = 120)
    private String serieChasis;

    @Column(name = "serie_motor", length = 120)
    private String serieMotor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "color_vehiculo_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ColorVehiculo colorVehiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pais_origen_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PaisOrigen paisOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_combustible_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private TipoCombustible tipoCombustible;

    /** Estado operativo según catálogo de la empresa (ej. operativa, en reparación). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_unidad_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EstadoUnidad estadoUnidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transmision_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Transmision transmision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "numero_eje_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private NumeroEje numeroEje;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuracion_eje_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ConfiguracionEje configuracionEje;

    /** Ciclo de vida en plataforma: ACTIVO, EN_TALLER, DADO_DE_BAJA */
    @Column(name = "estado_activo", nullable = false, length = 30)
    @Builder.Default
    private String estadoActivo = "ACTIVO";

    @Column(length = 50)
    private String cilindraje;

    private Integer pasajeros;

    @Column(length = 50)
    private String tonelaje;

    @Column(length = 100)
    private String capacidad;

    @Column(length = 50)
    private String potencia;

    @Column(name = "km_inicio")
    private Integer kmInicio;

    @Column(length = 50)
    private String largo;

    @Column(length = 50)
    private String ancho;

    @Column(length = 50)
    private String alto;

    @Column(name = "proyecto_asignado", length = 255)
    private String proyectoAsignado;

    @Column(name = "medida_neumaticos", length = 120)
    private String medidaNeumaticos;

    @Column(name = "marca_neumatico", length = 120)
    private String marcaNeumatico;

    @Column(name = "km_reencauche", length = 80)
    private String kmReencauche;

    @Column(name = "numero_repuestos")
    @Builder.Default
    private Integer numeroRepuestos = 0;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "foto_principal", columnDefinition = "TEXT")
    private String fotoPrincipal;

    @Column(name = "foto_lateral", columnDefinition = "TEXT")
    private String fotoLateral;

    @Column(name = "foto_interior", columnDefinition = "TEXT")
    private String fotoInterior;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.estadoActivo == null) this.estadoActivo = "ACTIVO";
        if (this.numeroRepuestos == null) this.numeroRepuestos = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
