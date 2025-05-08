package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entidad que representa una matriz de obligaciones para una empresa
 */
@Entity
@Table(name = "business_obligation_matrices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessObligationMatrix {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;
    
    @ManyToOne
    @JoinColumn(name = "obligation_matrix_id")
    private ObligationMatrix obligationMatrix;
    
    @Column(nullable = false)
    private String name;
    
    private String description;
    
    private String status;
    
    @Column(name = "due_date")
    private LocalDate dueDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Métodos para manejar las fechas automáticamente
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getObligationMatrixInfo() {
        return this.name + " - " + this.description;
    }
    
    public void setObligationMatrixInfo(String obligationMatrixInfo) {
        // Si viene en formato "nombre - descripción", separamos
        if (obligationMatrixInfo != null && obligationMatrixInfo.contains(" - ")) {
            String[] parts = obligationMatrixInfo.split(" - ", 2);
            this.name = parts[0];
            this.description = parts.length > 1 ? parts[1] : "";
        } else {
            // Si no, lo establecemos como nombre
            this.name = obligationMatrixInfo;
        }
    }
    
    public LocalDate getDueDate() {
        return this.dueDate;
    }
    
    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
}