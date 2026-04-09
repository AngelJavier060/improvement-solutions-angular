package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "gerencias_viajes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"business"})
@EqualsAndHashCode(exclude = {"business"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GerenciaViaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", length = 20)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnoreProperties({"users", "employees", "positions", "typeContracts", "typeDocuments",
            "departments", "iessItems", "businessObligationMatrices", "contractorCompanies",
            "contractorBlocks", "courseCertifications", "cards", "workSchedules", "workShifts"})
    private Business business;

    // ── Datos del viaje ─────────────────────────────────────────────────────

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "conductor", nullable = false, length = 200)
    private String conductor;

    @Column(name = "cedula", nullable = false, length = 20)
    private String cedula;

    @Column(name = "vehiculo_inicio", length = 100)
    private String vehiculoInicio;

    @Column(name = "km_inicial", precision = 12, scale = 2)
    private BigDecimal kmInicial;

    @Column(name = "telefono", length = 30)
    private String telefono;

    @Column(name = "cargo", length = 150)
    private String cargo;

    @Column(name = "area", length = 100)
    private String area;

    @Column(name = "proyecto", length = 200)
    private String proyecto;

    @Column(name = "motivo", length = 300)
    private String motivo;

    @Column(name = "origen", length = 300)
    private String origen;

    @Column(name = "destino", length = 300)
    private String destino;

    @Column(name = "fecha_salida")
    private LocalDate fechaSalida;

    @Column(name = "hora_salida", length = 10)
    private String horaSalida;

    // ── Validaciones previas ────────────────────────────────────────────────

    @Column(name = "licencia_vigente", length = 20)
    private String licenciaVigente;

    @Column(name = "manejo_defensivo", length = 20)
    private String manejoDefensivo;

    @Column(name = "inspeccion_vehiculo", length = 50)
    private String inspeccionVehiculo;

    @Column(name = "medios_comunicacion", length = 200)
    private String mediosComunicacion;

    @Column(name = "test_alcohol", length = 30)
    private String testAlcohol;

    // ── Pasajeros ───────────────────────────────────────────────────────────

    @Column(name = "lleva_pasajeros", length = 10)
    private String llevaPasajeros;

    @Column(name = "pasajeros", length = 200)
    private String pasajeros;

    // ── Vehículo y convoy ───────────────────────────────────────────────────

    @Column(name = "tipo_vehiculo", length = 100)
    private String tipoVehiculo;

    @Column(name = "convoy", length = 10)
    private String convoy;

    @Column(name = "unidades_convoy", length = 100)
    private String unidadesConvoy;

    // ── Condiciones de la vía ───────────────────────────────────────────────

    @Column(name = "tipo_carretera", length = 100)
    private String tipoCarretera;

    @Column(name = "estado_via", length = 50)
    private String estadoVia;

    @Column(name = "clima", length = 50)
    private String clima;

    @Column(name = "distancia", length = 50)
    private String distancia;

    // ── Carga y peligros ────────────────────────────────────────────────────

    @Column(name = "tipo_carga", length = 100)
    private String tipoCarga;

    @Column(name = "otros_peligros", length = 300)
    private String otrosPeligros;

    // ── Jornada del conductor ───────────────────────────────────────────────

    @Column(name = "horas_conduccion", length = 50)
    private String horasConduccion;

    @Column(name = "horario_viaje", length = 50)
    private String horarioViaje;

    @Column(name = "descanso_conductor", length = 100)
    private String descansoConduc;

    // ── Riesgos y control ───────────────────────────────────────────────────

    @Column(name = "riesgos_via", length = 500)
    private String riesgosVia;

    @Column(name = "medidas_control", length = 500)
    private String medidasControl;

    @Column(name = "paradas_planificadas", length = 300)
    private String paradasPlanificadas;

    // ── Km final ────────────────────────────────────────────────────────────

    @Column(name = "km_final", precision = 12, scale = 2)
    private BigDecimal kmFinal;

    @Column(name = "fecha_cierre")
    private LocalDate fechaCierre;

    // ── Estado ──────────────────────────────────────────────────────────────

    @Builder.Default
    @Column(name = "estado", length = 20, nullable = false)
    private String estado = "ACTIVO";

    // ── Auditoría ───────────────────────────────────────────────────────────

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
