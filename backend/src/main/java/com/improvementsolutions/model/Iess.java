package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "iesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Iess {

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
    @ManyToMany(mappedBy = "ieses")
    private Set<Business> businesses = new HashSet<>();

    // Relación uno a muchos con BusinessEmployee
    @OneToMany(mappedBy = "iess")
    private Set<BusinessEmployee> businessEmployees = new HashSet<>();
}