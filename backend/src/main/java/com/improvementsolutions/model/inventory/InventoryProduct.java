package com.improvementsolutions.model.inventory;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.improvementsolutions.model.Business;
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

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "unit_of_measure", length = 50)
    private String unitOfMeasure;

    // Ficha técnica
    @Column(length = 100)
    private String brand;

    @Column(length = 100)
    private String model;

    @Column(name = "specs_json", columnDefinition = "TEXT")
    private String specsJson; // texto (JSON serializado) con especificaciones técnicas

    @Column(name = "certifications_json", columnDefinition = "TEXT")
    private String certificationsJson; // texto (JSON serializado) con certificaciones

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "business"})
    private InventorySupplier supplier;

    @Column(length = 255)
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductStatus status = ProductStatus.ACTIVO;

    @Column(name = "min_stock")
    private Integer minStock;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (status == null) status = ProductStatus.ACTIVO;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
