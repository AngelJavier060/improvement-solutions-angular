package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_work_days",
       uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "work_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee"})
@EqualsAndHashCode(exclude = {"business", "employee"})
public class EmployeeWorkDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    /** T=Trabajo, D=Descanso, EX=Extra, V=Vacaciones, P=Permiso, E=Enfermedad */
    @Column(name = "day_type", nullable = false, length = 10)
    private String dayType = "T";

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
