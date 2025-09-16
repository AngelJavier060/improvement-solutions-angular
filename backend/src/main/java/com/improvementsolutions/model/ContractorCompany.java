package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa una empresa contratista
 * Una empresa contratista puede tener múltiples bloques
 */
@Entity
@Table(name = "contractor_companies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"blocks"})
@ToString(exclude = {"blocks"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ContractorCompany {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true)
    private String code; // Código identificador de la empresa contratista
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relación con bloques
    @OneToMany(mappedBy = "contractorCompany", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ContractorBlock> blocks = new ArrayList<>();
    
    // Relación con empleados (para estadísticas)
    @OneToMany(mappedBy = "contractorCompany")
    @JsonIgnore
    private List<BusinessEmployee> employees = new ArrayList<>();

    // Métodos de utilidad para gestionar bloques
    public void addBlock(ContractorBlock block) {
        blocks.add(block);
        block.setContractorCompany(this);
    }

    public void removeBlock(ContractorBlock block) {
        blocks.remove(block);
        block.setContractorCompany(null);
    }

    // Métodos del ciclo de vida JPA
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}