package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "obligation_matrices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObligationMatrix {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "legal_compliance", nullable = false)
    private String legalCompliance;

    @Column(name = "legal_regulation", nullable = false)
    private String legalRegulation;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Getter virtual para name que usa legalCompliance
    public String getName() {
        return this.legalCompliance;
    }
    
    // Setter virtual para name que actualiza legalCompliance
    public void setName(String name) {
        this.legalCompliance = name;
    }
}
