package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "parametro_metodologia")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"metodologiaRiesgo", "niveles"})
@EqualsAndHashCode(exclude = {"metodologiaRiesgo", "niveles"})
public class ParametroMetodologia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "metodologia_riesgo_id", nullable = false)
    @JsonIgnoreProperties({"parametros"})
    private MetodologiaRiesgo metodologiaRiesgo;

    @Column(nullable = false, length = 10)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_calculated")
    private Boolean isCalculated = false;

    /**
     * Tipo de uso del parámetro dentro de la metodología:
     * - FACTOR: el valor proviene de la configuración del factor evaluado (ej: NE, ND de Distancia a Recorrer)
     * - SELECCIONABLE: el evaluador elige un nivel al momento de la evaluación (ej: NC - Nivel de Consecuencia)
     * - CALCULADO: se obtiene por fórmula a partir de otros parámetros (ej: NP = NE×ND, NR = NP×NC)
     */
    @Column(name = "tip_uso", length = 20)
    private String tipUso;

    private String formula;

    @Column(name = "source_entity", columnDefinition = "TEXT")
    private String sourceEntity;

    @Column(name = "source_entity_label", columnDefinition = "TEXT")
    private String sourceEntityLabel;

    @OneToMany(mappedBy = "parametroMetodologia", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"parametroMetodologia"})
    @OrderBy("valor ASC")
    private List<NivelParametro> niveles = new ArrayList<>();

    @Column(name = "created_at")
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
