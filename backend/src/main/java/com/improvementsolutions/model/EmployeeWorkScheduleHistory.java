package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_work_schedule_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeWorkScheduleHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_schedule_id", nullable = false)
    private WorkSchedule workSchedule;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Fecha desde la cual se calcula el ciclo T/D. Por defecto, puede ser igual a startDate
    @Column(name = "cycle_start_date")
    private LocalDate cycleStartDate;

    // Inclusive; null = vigente hasta nuevo aviso
    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * Horas ordinarias de trabajo por día en este periodo de jornada.
     * Se usa como base para cálculos de horas hombre (HHTT). Opcional; si es null
     * se aplicará una convención (por ejemplo 8h/día) en los módulos de reporte.
     */
    @Column(name = "daily_hours")
    private Double dailyHours;

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
