package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un contrato de empleado en una empresa
 */
@Entity
@Table(name = "business_employee_contracts")
@SQLDelete(sql = "UPDATE business_employee_contracts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployeeContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_employee_id", nullable = false)
    @ToString.Exclude
    private BusinessEmployee businessEmployee;

    @Column(name = "type_contract_id")
    private Long typeContractId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    private BigDecimal salary;

    @Column(name = "working_hours")
    private String workingHours;

    @Column(name = "contract_file")
    private String contractFile;

    private String status;

    @Column(name = "is_current")
    private boolean isCurrent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relación uno a muchos con archivos del contrato
    @OneToMany(mappedBy = "businessEmployeeContract", cascade = CascadeType.ALL)
    @ToString.Exclude  // Evitar ciclos infinitos en toString()
    private Set<BusinessEmployeeContractFile> files = new HashSet<>();

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

    // Método para manejar la relación bidireccional con BusinessEmployee
    public void setBusinessEmployee(BusinessEmployee employee) {
        this.businessEmployee = employee;
        if (employee != null && !employee.getContracts().contains(this)) {
            employee.getContracts().add(this);
        }
    }

    public boolean isCurrent() {
        return isCurrent;
    }

    public void setIsCurrent(boolean isCurrent) {
        this.isCurrent = isCurrent;
    }
}