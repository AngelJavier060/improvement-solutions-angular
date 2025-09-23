package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "business_obligation_matrix_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessObligationMatrixVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_obligation_matrix_id", nullable = false)
    private BusinessObligationMatrix businessObligationMatrix;

    @Column(nullable = false)
    private Integer version;

    private String name;
    private String description;
    private String observations;
    private LocalDate dueDate;
    private String status;
    private String priority;
    private String responsiblePerson;
    private boolean completed;
    private LocalDateTime completionDate;

    // Fecha de ingreso registrada para esa versión
    @Column(name = "entry_date")
    private LocalDateTime entryDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
