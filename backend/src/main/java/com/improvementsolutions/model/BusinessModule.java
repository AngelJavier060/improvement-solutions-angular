package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "business_modules", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"business_id", "module_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BusinessModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnoreProperties({"users", "employees", "positions", "typeContracts", "typeDocuments",
            "departments", "iessItems", "businessObligationMatrices", "contractorCompanies",
            "contractorBlocks", "courseCertifications", "cards"})
    private Business business;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "module_id", nullable = false)
    private SystemModule module;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id")
    private SubscriptionPlan plan;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(length = 20, nullable = false)
    private String status = "ACTIVO";

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Un módulo está efectivamente habilitado si:
     * 1. active = true
     * 2. La fecha actual está dentro del rango [startDate, expirationDate]
     *    (si alguna fecha es null, se ignora ese límite)
     */
    @Transient
    public boolean isEffectivelyActive() {
        if (!Boolean.TRUE.equals(active)) return false;
        LocalDate today = LocalDate.now();
        if (startDate != null && today.isBefore(startDate)) return false;
        if (expirationDate != null && today.isAfter(expirationDate)) return false;
        return true;
    }
}
