package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad que representa un archivo de contrato de empleado
 */
@Entity
@Table(name = "business_employee_contract_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployeeContractFile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "business_employee_contract_id", nullable = false)
    private BusinessEmployeeContract businessEmployeeContract;
    
    @Column(nullable = false)
    private String fileName;
    
    @Column(nullable = false)
    private String filePath;
    
    private String description;
    
    private String fileType;
    
    private Long fileSize;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
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
    
    // Métodos faltantes según BusinessEmployeeContractFileService
    public void setName(String name) {
        this.fileName = name;
    }
    
    public void setFile(String filePath) {
        this.filePath = filePath;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getFile() {
        return this.filePath;
    }
}
