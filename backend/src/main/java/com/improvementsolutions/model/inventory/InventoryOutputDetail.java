package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_output_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryOutputDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "output_id", nullable = false)
    @JsonIgnore
    private InventoryOutput output;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private InventoryVariant variant;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "total_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "lot_number", length = 50)
    private String lotNumber;

    @Column(name = "warehouse_location", length = 100)
    private String warehouseLocation;

    @Column(name = "item_condition", length = 20)
    private String itemCondition;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
        if (this.quantity == null) this.quantity = BigDecimal.ZERO;
        if (this.unitCost == null) this.unitCost = BigDecimal.ZERO;
        if (this.totalCost == null) this.totalCost = BigDecimal.ZERO;
    }
}
