package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "business_incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"business"})
@EqualsAndHashCode(exclude = {"business"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BusinessIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnoreProperties({"users", "employees", "positions", "typeContracts", "typeDocuments",
            "departments", "iessItems", "businessObligationMatrices", "contractorCompanies",
            "contractorBlocks", "courseCertifications", "cards", "workSchedules", "workShifts"})
    private Business business;

    // ── Sección 1: Datos Específicos ────────────────────────────────────────

    /**
     * Salud y Seguridad | Ambiente | Financiero/Activos/Producción |
     * Reputación/Licencia para operar | Procesos
     */
    @Column(name = "affectation_type", length = 60)
    private String affectationType;

    @Column(name = "incident_date", nullable = false)
    private LocalDate incidentDate;

    @Column(name = "incident_time")
    private LocalTime incidentTime;

    @Column(length = 255)
    private String location;

    /**
     * Propio | Contratista
     */
    @Column(name = "personnel_type", length = 20)
    private String personnelType;

    @Column(name = "company_name", length = 200)
    private String companyName;

    // ── Sección 2: Información del Personal ────────────────────────────────

    @Column(name = "person_name", length = 200)
    private String personName;

    @Column(name = "person_cedula", length = 20)
    private String personCedula;

    @Column(name = "person_position", length = 100)
    private String personPosition;

    @Column(name = "person_area", length = 100)
    private String personArea;

    @Column(name = "person_age")
    private Integer personAge;

    @Column(name = "person_gender", length = 20)
    private String personGender;

    @Column(name = "person_shift", length = 30)
    private String personShift;

    @Column(name = "person_experience", length = 80)
    private String personExperience;

    // ── Sección 3: Detalles del Evento ─────────────────────────────────────

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    /**
     * Incidente | Accidente con tiempo perdido | Accidente sin tiempo perdido |
     * Incidente sin lección | Accidente en trayecto e Itínere |
     * No accidente de trabajo | No aplica
     */
    @Column(name = "event_classification", length = 80)
    private String eventClassification;

    // ── Sección 4: Acciones de Mitigación Inmediata ───────────────────────

    @Column(name = "mitigation_actions", columnDefinition = "TEXT")
    private String mitigationActions;

    // ── Sección 5: Nivel de Investigación y Criterios ────────────────────

    @Builder.Default
    @Column(name = "is_high_potential")
    private Boolean isHighPotential = false;

    @Builder.Default
    @Column(name = "is_critical_enap")
    private Boolean isCriticalEnap = false;

    @Builder.Default
    @Column(name = "is_fatal")
    private Boolean isFatal = false;

    @Builder.Default
    @Column(name = "requires_resuscitation")
    private Boolean requiresResuscitation = false;

    @Builder.Default
    @Column(name = "requires_rescue")
    private Boolean requiresRescue = false;

    @Builder.Default
    @Column(name = "fall_over_2m")
    private Boolean fallOver2m = false;

    @Builder.Default
    @Column(name = "involves_amputation")
    private Boolean involvesAmputation = false;

    @Builder.Default
    @Column(name = "affects_normal_task")
    private Boolean affectsNormalTask = false;

    @Builder.Default
    @Column(name = "is_collective")
    private Boolean isCollective = false;

    @Column(name = "life_rule_violated", length = 100)
    private String lifeRuleViolated;

    @Column(name = "api_level", length = 20)
    private String apiLevel;

    @Column(name = "has_occurred_before", length = 200)
    private String hasOccurredBefore;

    @Column(name = "investigation_level", length = 80)
    private String investigationLevel;

    // ── Sección 6: Comentarios y Evidencia ───────────────────────────────

    @Column(name = "preliminary_comments", columnDefinition = "TEXT")
    private String preliminaryComments;

    @Column(name = "control_measures", columnDefinition = "TEXT")
    private String controlMeasures;

    // Rutas de evidencias separadas por '|'
    @Column(name = "evidence_paths", columnDefinition = "TEXT")
    private String evidencePaths;

    // ── Sección 7: Generación del Informe ───────────────────────────────

    @Column(name = "reported_by", length = 150)
    private String reportedBy;

    @Column(name = "report_date")
    private java.time.LocalDate reportDate;

    @Column(name = "reviewed_by", length = 150)
    private String reviewedBy;

    @Column(name = "approved_by", length = 150)
    private String approvedBy;

    // ── Estado de la Alerta ───────────────────────────────────────────────

    /**
     * ABIERTO | CERRADO | EN_REVISION
     */
    @Builder.Default
    @Column(name = "lost_days")
    private Integer lostDays = 0;

    @Builder.Default
    @Column(name = "status", length = 20, nullable = false)
    private String status = "ABIERTO";

    // ── Auditoría ─────────────────────────────────────────────────────────

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
