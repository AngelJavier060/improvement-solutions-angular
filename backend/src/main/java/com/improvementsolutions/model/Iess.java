package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa información de IESS (Instituto Ecuatoriano de Seguridad Social)
 */
@Entity
@Table(name = "iess")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Iess {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
      @Column(nullable = false, unique = true, name = "name")
    private String code; // Renombrado de name a code, pero mantenemos columna "name" en base de datos
    
    @Column
    private String description;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Actualizamos el mappedBy para que coincida con el nuevo nombre en Business
    @ManyToMany(mappedBy = "iessItems")
    @ToString.Exclude // Evitar problemas en toString por referencias circulares
    @JsonIgnore // Evitar serialización del lado inverso y LazyInitialization
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
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }
}
