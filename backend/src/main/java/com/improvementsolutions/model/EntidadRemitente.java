package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "entidad_remitentes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntidadRemitente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    /**
     * Grupo de documentación: DOCUMENTOS_PRINCIPALES | CERTIFICACIONES | LIBERACIONES | DOCUMENTOS_ADICIONALES.
     */
    @Column(name = "category", length = 40)
    private String category = "DOCUMENTOS_PRINCIPALES";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.category == null || this.category.isBlank()) {
            this.category = "DOCUMENTOS_PRINCIPALES";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.category == null || this.category.isBlank()) {
            this.category = "DOCUMENTOS_PRINCIPALES";
        }
    }

    public String getCategoryOrDefault() {
        if (category == null || category.isBlank()) {
            return "DOCUMENTOS_PRINCIPALES";
        }
        return category.trim();
    }
}
