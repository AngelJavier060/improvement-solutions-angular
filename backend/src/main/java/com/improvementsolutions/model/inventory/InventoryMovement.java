package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.enums.MovementType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_movements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private InventoryVariant variant;

    @Column(name = "movement_date", nullable = false)
    private LocalDateTime movementDate = LocalDateTime.now();

    @Column(name = "date", nullable = false)
    private LocalDateTime date = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 20)
    private MovementType movementType;

    @Column(name = "document_type", length = 30)
    private String documentType; // COMPRA, VENTA, DEVOLUCION, etc.

    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity; // positivo=entrada, negativo=salida

    @Column(nullable = false)
    private Integer qty; // Campo legacy, mismo valor que quantity convertido a int

    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "balance_qty", nullable = false, precision = 10, scale = 2)
    private BigDecimal balanceQty; // Saldo después del movimiento

    @Column(name = "balance_cost", nullable = false, precision = 10, scale = 4)
    private BigDecimal balanceCost; // Costo promedio después del movimiento

    @Column(name = "reference_id")
    private Long referenceId; // ID de la entrada/salida origen

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.movementDate == null) this.movementDate = LocalDateTime.now();
        if (this.date == null) this.date = LocalDateTime.now();
        if (this.unitCost == null) this.unitCost = BigDecimal.ZERO;
        if (this.quantity == null) this.quantity = BigDecimal.ZERO;
        if (this.balanceQty == null) this.balanceQty = BigDecimal.ZERO;
        if (this.balanceCost == null) this.balanceCost = BigDecimal.ZERO;
        // Sync qty (legacy int) with quantity (modern decimal)
        if (this.qty == null && this.quantity != null) {
            this.qty = this.quantity.intValue();
        }
    }
}
