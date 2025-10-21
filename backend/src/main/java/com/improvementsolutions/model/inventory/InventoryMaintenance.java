package com.improvementsolutions.model.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.improvementsolutions.model.Business;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_maintenances")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMaintenance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private InventoryVariant variant;

    @Column(name = "spares_json", columnDefinition = "JSON")
    private String sparesJson;

    @Column(name = "spares_cost", precision = 18, scale = 4)
    private BigDecimal sparesCost = BigDecimal.ZERO;

    @Column(name = "labor_cost", precision = 18, scale = 4)
    private BigDecimal laborCost = BigDecimal.ZERO;

    @Column(name = "total_cost", precision = 18, scale = 4)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(name = "responsible", length = 150)
    private String responsible;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (sparesCost == null) sparesCost = BigDecimal.ZERO;
        if (laborCost == null) laborCost = BigDecimal.ZERO;
        if (totalCost == null) totalCost = BigDecimal.ZERO;
        if (date == null) date = LocalDate.now();
    }
}
