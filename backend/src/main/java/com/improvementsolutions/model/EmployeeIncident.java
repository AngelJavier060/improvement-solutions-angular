package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee"})
@EqualsAndHashCode(exclude = {"business", "employee"})
public class EmployeeIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "incident_date", nullable = false)
    private LocalDate incidentDate;

    @Column(name = "incident_time")
    private LocalTime incidentTime;

    /**
     * ACCIDENTE | INCIDENTE | CUASI_ACCIDENTE
     */
    @Column(name = "incident_type", nullable = false, length = 30)
    private String incidentType = "INCIDENTE";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String location;

    /**
     * LEVE | MODERADO | GRAVE | FATAL
     */
    @Column(length = 20)
    private String severity = "LEVE";

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
