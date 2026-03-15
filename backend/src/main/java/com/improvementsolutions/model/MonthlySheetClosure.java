package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_sheet_closures",
       uniqueConstraints = @UniqueConstraint(columnNames = {"business_id", "year", "month"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlySheetClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    /**
     * OPEN    = planilla en edición
     * CLOSED  = cerrada, PDF generado pendiente de firma
     * APPROVED = PDF firmado subido, mes aprobado
     */
    @Column(nullable = false)
    private String status = "OPEN";

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    // Ruta/URL del PDF generado
    @Column(name = "pdf_path")
    private String pdfPath;

    // Ruta/URL del PDF firmado subido por el encargado
    @Column(name = "signed_pdf_path")
    private String signedPdfPath;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at")
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
}
