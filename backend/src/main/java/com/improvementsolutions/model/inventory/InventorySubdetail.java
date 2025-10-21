package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.improvementsolutions.model.inventory.enums.SubdetailState;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_subdetails")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventorySubdetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private InventoryVariant variant;

    @Column(name = "lot", length = 100)
    private String lot;

    @Column(name = "detail_location", length = 150)
    private String detailLocation;

    @Column(name = "qty")
    private Integer qty = 0;

    @Column(name = "unit_cost", precision = 18, scale = 4)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private InventorySupplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", length = 30)
    private SubdetailState state = SubdetailState.NUEVO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (qty == null) qty = 0;
        if (unitCost == null) unitCost = BigDecimal.ZERO;
        if (state == null) state = SubdetailState.NUEVO;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
