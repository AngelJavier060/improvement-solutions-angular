package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Entity
@Table(name = "nivel_parametro")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"parametroMetodologia"})
@EqualsAndHashCode(exclude = {"parametroMetodologia"})
public class NivelParametro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parametro_metodologia_id", nullable = false)
    @JsonIgnoreProperties({"niveles", "metodologiaRiesgo"})
    private ParametroMetodologia parametroMetodologia;

    @Column(nullable = false)
    private Double valor;

    @Column(nullable = false)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String color;

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
