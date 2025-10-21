package com.improvementsolutions.model.inventory;

import java.time.LocalDateTime;
import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.improvementsolutions.model.inventory.enums.VariantStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_variants")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private InventoryProduct product;

    @Column(nullable = false, length = 100)
    private String code;

    @Column(length = 200)
    private String description;

    @Column(name = "size_label", length = 50)
    private String sizeLabel;

    @Column(name = "dimensions", length = 100)
    private String dimensions;

    @Column(name = "current_qty", precision = 10, scale = 2)
    private BigDecimal currentQty = BigDecimal.ZERO;

    @Column(name = "min_qty", precision = 10, scale = 2)
    private BigDecimal minQty;

    @Column(name = "unit_cost", precision = 18, scale = 4)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "sale_price", precision = 18, scale = 2)
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(length = 150)
    private String location;

    @Column(length = 255)
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VariantStatus status = VariantStatus.ACTIVO;

    @Version
    private Long version;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (currentQty == null) currentQty = BigDecimal.ZERO;
        if (unitCost == null) unitCost = BigDecimal.ZERO;
        if (salePrice == null) salePrice = BigDecimal.ZERO;
        if (status == null) status = VariantStatus.ACTIVO;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
