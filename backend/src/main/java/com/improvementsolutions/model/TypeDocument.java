package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un tipo de documento
 */
@Entity
@Table(name = "type_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypeDocument {
    
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
    
    @ManyToMany(mappedBy = "typeDocuments")
    @ToString.Exclude // Evitamos referencias circulares
    private Set<Business> businesses = new HashSet<>();
    
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
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    // Métodos helper para mantener la relación bidireccional
    public void addBusiness(Business business) {
        this.businesses.add(business);
        if (!business.getTypeDocuments().contains(this)) {
            business.getTypeDocuments().add(this);
        }
    }

    public void removeBusiness(Business business) {
        this.businesses.remove(business);
        if (business.getTypeDocuments().contains(this)) {
            business.getTypeDocuments().remove(this);
        }
    }
}
