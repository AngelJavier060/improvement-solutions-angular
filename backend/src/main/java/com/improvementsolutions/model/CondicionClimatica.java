package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "condicion_climaticas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CondicionClimatica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "metodologia_riesgo_id")
    @JsonIgnoreProperties({"parametros"})
    private MetodologiaRiesgo metodologiaRiesgo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ne_nivel_id", nullable = true)
    @JsonIgnoreProperties({"parametroMetodologia"})
    private NivelParametro neNivel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nd_nivel_id", nullable = true)
    @JsonIgnoreProperties({"parametroMetodologia"})
    private NivelParametro ndNivel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nc_nivel_id", nullable = true)
    @JsonIgnoreProperties({"parametroMetodologia"})
    private NivelParametro ncNivel;

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
