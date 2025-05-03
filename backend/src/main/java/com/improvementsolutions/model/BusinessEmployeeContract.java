package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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

    @ManyToOne
    @JoinColumn(name = "business_employee_id", nullable = false)
    private BusinessEmployee businessEmployee;

    @ManyToOne
    @JoinColumn(name = "type_contract_id")
    private TypeContract typeContract;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    private String status;

    private Double salary;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relación uno a muchos con archivos del contrato
    @OneToMany(mappedBy = "businessEmployeeContract", cascade = CascadeType.ALL)
    private Set<BusinessEmployeeContractFile> files = new HashSet<>();
    
    // Relación inversa con BusinessEmployee para el contrato actual
    @OneToOne(mappedBy = "currentContract")
    private BusinessEmployee employeeWithCurrentContract;
}