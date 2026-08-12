package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "tipo_documento_vehiculos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TipoDocumentoVehiculo {

    public static final String CAT_DOCUMENTOS_PRINCIPALES = "DOCUMENTOS_PRINCIPALES";
    public static final String CAT_CERTIFICACIONES = "CERTIFICACIONES";
    public static final String CAT_LIBERACIONES = "LIBERACIONES";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    /**
     * Grupo operativo: DOCUMENTOS_PRINCIPALES | CERTIFICACIONES | LIBERACIONES.
     * Nullable en BD para despliegues graduales; si es null se trata como DOCUMENTOS_PRINCIPALES.
     */
    @Column(name = "category", length = 40)
    private String category = CAT_DOCUMENTOS_PRINCIPALES;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getCategoryOrDefault() {
        if (category == null || category.isBlank()) {
            return CAT_DOCUMENTOS_PRINCIPALES;
        }
        return category.trim();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.category == null || this.category.isBlank()) {
            this.category = CAT_DOCUMENTOS_PRINCIPALES;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.category == null || this.category.isBlank()) {
            this.category = CAT_DOCUMENTOS_PRINCIPALES;
        }
    }
}
