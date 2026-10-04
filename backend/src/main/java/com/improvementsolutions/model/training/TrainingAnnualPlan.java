package com.improvementsolutions.model.training;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "training_annual_plan",
        uniqueConstraints = @UniqueConstraint(name = "uk_training_plan_biz_year_prog", columnNames = {"business_id", "year", "program"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingAnnualPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(nullable = false)
    private Integer year;

    /** SSA | SALUD | AMBIENTE — Fase 1 solo SSA */
    @Column(nullable = false, length = 20)
    private String program;

    /** OPEN | CLOSED */
    @Column(nullable = false, length = 20)
    private String status;

    /** DRAFT | APPROVED */
    @Column(name = "approval_status", length = 20)
    private String approvalStatus;

    @Column(name = "approved_file", length = 400)
    private String approvedFile;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by", length = 80)
    private String approvedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = "OPEN";
        if (program == null) program = "SSA";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
