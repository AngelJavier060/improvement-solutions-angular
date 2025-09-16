package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un tipo de contrato
 */
@Data
@Entity
@Table(name = "type_contracts")
public class TypeContract {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;
    
    private String description;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToMany(mappedBy = "typeContracts")
    @JsonIgnore // Evitar serialización bidireccional
    private Set<Business> businesses = new HashSet<>();

    // Métodos de utilidad
    public void addBusiness(Business business) {
        this.businesses.add(business);
        business.getTypeContracts().add(this);
    }

    public void removeBusiness(Business business) {
        this.businesses.remove(business);
        business.getTypeContracts().remove(this);
    }

    // Métodos del ciclo de vida JPA
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
