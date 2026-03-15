package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_overtime")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee"})
@EqualsAndHashCode(exclude = {"business", "employee"})
public class EmployeeOvertime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public double getHoursTotal() {
        if (startTime == null || endTime == null) return 0;
        long minutes = java.time.Duration.between(startTime, endTime).toMinutes();
        return Math.max(0, minutes / 60.0);
    }
}
