package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "employee_vacations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee"})
@EqualsAndHashCode(exclude = {"business", "employee"})
public class EmployeeVacation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "days_accumulated")
    private Integer daysAccumulated = 0;

    @Column(length = 1000)
    private String notes;

    @Column(length = 20)
    private String status = "APROBADO";

    @Column(name = "signed_pdf_path", length = 500)
    private String signedPdfPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public int getDaysTaken() {
        if (startDate == null || endDate == null) return 0;
        // endDate = día de reincorporación (no cuenta como vacación)
        return (int) ChronoUnit.DAYS.between(startDate, endDate);
    }
}
