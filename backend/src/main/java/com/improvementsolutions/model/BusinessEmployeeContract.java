package com.improvementsolutions.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.annotations.Filter;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "business_employee_contracts")
@Data
@EqualsAndHashCode(exclude = {"businessEmployee"})
@ToString(exclude = {"businessEmployee"})
@SQLDelete(sql = "UPDATE business_employee_contracts SET active = false WHERE id = ?")
@FilterDef(name = "deletedBusinessEmployeeContractFilter", parameters = @ParamDef(name = "isDeleted", type = boolean.class))
@Filter(name = "deletedBusinessEmployeeContractFilter", condition = "active = :isDeleted")
public class BusinessEmployeeContract {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_business_employee")
    private BusinessEmployee businessEmployee;

    private String type;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Double salary;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long typeContractId;
    private String workingHours;
    private String contractFile;
    private boolean isCurrent;
    private String status;

    public Long getTypeContractId() {
        return typeContractId;
    }

    public void setTypeContractId(Long typeContractId) {
        this.typeContractId = typeContractId;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public String getContractFile() {
        return contractFile;
    }

    public void setContractFile(String contractFile) {
        this.contractFile = contractFile;
    }

    public boolean isCurrent() {
        return isCurrent;
    }

    public void setIsCurrent(boolean isCurrent) {
        this.isCurrent = isCurrent;
    }
}
