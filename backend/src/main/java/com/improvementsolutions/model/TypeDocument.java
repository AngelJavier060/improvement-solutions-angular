package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un tipo de documento
 */
@Entity
@Table(name = "type_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = {"id", "name"})
@ToString(exclude = "businesses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TypeDocument {
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

    @ManyToMany(mappedBy = "typeDocuments", fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<Business> businesses = new HashSet<>();

    public void addBusiness(Business business) {
        businesses.add(business);
        if (!business.getTypeDocuments().contains(this)) {
            business.getTypeDocuments().add(this);
        }
    }

    public void removeBusiness(Business business) {
        businesses.remove(business);
        if (business.getTypeDocuments().contains(this)) {
            business.getTypeDocuments().remove(this);
        }
    }

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
