package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.enums.ItemCondition;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_lots")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryLot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnore
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private InventoryVariant variant;

    @Column(name = "lot_number", nullable = false, length = 100)
    private String lotNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "current_qty", precision = 10, scale = 2)
    private BigDecimal currentQty = BigDecimal.ZERO;

    @Column(name = "warehouse_location", length = 100)
    private String warehouseLocation;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", length = 30)
    private ItemCondition itemCondition = ItemCondition.NUEVO;

    @Column(length = 20)
    private String status = "ACTIVO"; // ACTIVO, VENCIDO, AGOTADO

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.currentQty == null) this.currentQty = BigDecimal.ZERO;
        if (this.status == null) this.status = "ACTIVO";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        // Actualizar status basado en vencimiento
        if (this.expirationDate != null && this.expirationDate.isBefore(LocalDate.now())) {
            this.status = "VENCIDO";
        } else if (this.currentQty != null && this.currentQty.compareTo(BigDecimal.ZERO) <= 0) {
            this.status = "AGOTADO";
        }
    }
}
