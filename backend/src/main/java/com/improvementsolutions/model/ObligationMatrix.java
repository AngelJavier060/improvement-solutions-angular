package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "obligation_matrices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ObligationMatrix {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relación uno a muchos con BusinessObligationMatrix
    @OneToMany(mappedBy = "obligationMatrix")
    private Set<BusinessObligationMatrix> businessObligationMatrices = new HashSet<>();
}
