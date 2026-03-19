package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_permissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee"})
@EqualsAndHashCode(exclude = {"business", "employee"})
public class EmployeePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "permission_date", nullable = false)
    private LocalDate permissionDate;

    /**
     * ESTUDIOS | CALAMIDAD | PERSONAL | MEDICO | OTRO
     */
    @Column(name = "permission_type", nullable = false, length = 50)
    private String permissionType;

    @Column(name = "hours_requested", precision = 4, scale = 2)
    private BigDecimal hoursRequested = BigDecimal.ZERO;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(length = 1000)
    private String notes;

    @Column(length = 20)
    private String status = "APROBADO";

    @Column(name = "signed_pdf_path", length = 300)
    private String signedPdfPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
