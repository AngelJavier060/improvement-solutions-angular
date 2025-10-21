package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.improvementsolutions.model.inventory.enums.ItemCondition;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_entry_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryEntryDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entry_id", nullable = false)
    @JsonIgnore
    private InventoryEntry entry;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variant_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private InventoryVariant variant;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity; // Cuántos llegaron

    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitCost; // Costo unitario SIN IVA

    @Column(name = "tax_percentage", precision = 5, scale = 2)
    private BigDecimal taxPercentage = BigDecimal.ZERO; // % IVA (ej: 12.00)

    @Column(name = "tax_amount", precision = 10, scale = 4)
    private BigDecimal taxAmount = BigDecimal.ZERO; // Valor del IVA por unidad

    @Column(name = "total_cost", nullable = false, precision = 12, scale = 4)
    private BigDecimal totalCost; // Costo total = quantity * (unitCost + taxAmount)

    @Column(name = "lot_number", length = 100)
    private String lotNumber; // Lote del proveedor

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate; // Fecha de fabricación

    @Column(name = "expiration_date")
    private LocalDate expirationDate; // Fecha de vencimiento

    @Column(name = "warehouse_location", length = 100)
    private String warehouseLocation; // Ubicación física

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", length = 30)
    private ItemCondition itemCondition = ItemCondition.NUEVO;

    @Column(columnDefinition = "TEXT")
    private String notes; // Observaciones específicas

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        // Calcular taxAmount si no está establecido
        if (this.taxAmount == null || this.taxAmount.compareTo(BigDecimal.ZERO) == 0) {
            if (this.taxPercentage != null && this.unitCost != null) {
                this.taxAmount = this.unitCost.multiply(this.taxPercentage).divide(new BigDecimal("100"), 4, BigDecimal.ROUND_HALF_UP);
            }
        }
        // Calcular totalCost
        if (this.quantity != null && this.unitCost != null) {
            BigDecimal costWithTax = this.unitCost.add(this.taxAmount != null ? this.taxAmount : BigDecimal.ZERO);
            this.totalCost = this.quantity.multiply(costWithTax);
        }
    }
}
