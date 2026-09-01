package com.improvementsolutions.model.inventory;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.enums.ProductCategory;
import com.improvementsolutions.model.inventory.enums.ProductStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnore
    private Business business;

    @Column(nullable = false, length = 100)
    private String code;

    @Column(nullable = true, length = 50)
    private String category;

    /**
     * Tipo operativo del producto: EPP | HERRAMIENTA | PIEZA.
     * Separado de la categoría libre (category / categoryRef).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "product_kind", length = 20)
    private ProductCategory productKind = ProductCategory.EPP;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "business", "parent"})
    private InventoryCategory categoryRef;

    @Column(nullable = false, length = 200)
    private String name;

    /**
     * Sección dentro de la familia (CAS=Casco, PAN=Pantalón, TAL=Taladro, etc.).
     * Jerarquía: familia (productKind) → sección → producto → variantes.
     */
    @Column(name = "section_code", length = 10)
    private String sectionCode;

    @Column(name = "section_label", length = 80)
    private String sectionLabel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "unit_of_measure", length = 50)
    private String unitOfMeasure;

    @Column(length = 255)
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductStatus status = ProductStatus.ACTIVO;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (status == null) status = ProductStatus.ACTIVO;
        if (productKind == null) productKind = ProductCategory.EPP;
        if (unitOfMeasure == null || unitOfMeasure.isBlank()) unitOfMeasure = "UND";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
