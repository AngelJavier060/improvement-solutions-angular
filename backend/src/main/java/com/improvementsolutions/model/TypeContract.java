package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "type_contracts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypeContract {

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

    // Relación muchos a muchos con Business
    @ManyToMany(mappedBy = "typeContracts")
    private Set<Business> businesses = new HashSet<>();

    // Relación uno a muchos con BusinessEmployeeContract
    @OneToMany(mappedBy = "typeContract")
    private Set<BusinessEmployeeContract> businessEmployeeContracts = new HashSet<>();
}
