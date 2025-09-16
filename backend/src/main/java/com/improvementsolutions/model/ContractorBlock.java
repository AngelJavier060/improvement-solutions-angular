package com.improvementsolutions.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa un bloque de una empresa contratista
 * Ejemplo: Bloque 15, Bloque 18, Bloque 31, etc.
 */
@Entity
@Table(name = "contractor_blocks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"contractorCompany", "employees"})
@ToString(exclude = {"contractorCompany", "employees"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ContractorBlock {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name; // "Bloque 15", "Bloque 18", "Bloque 31"
    
    private String code; // "B15", "B18", "B31"
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relación con empresa contratista
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contractor_company_id", nullable = false)
    private ContractorCompany contractorCompany;
    
    // Relación con empleados (para estadísticas)
    @OneToMany(mappedBy = "contractorBlock")
    @JsonIgnore
    private List<BusinessEmployee> employees = new ArrayList<>();

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

    // Método de utilidad para obtener el nombre completo
    public String getFullName() {
        if (contractorCompany != null) {
            return contractorCompany.getName() + " - " + this.name;
        }
        return this.name;
    }
}