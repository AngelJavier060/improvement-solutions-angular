package com.improvementsolutions.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.Where;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "business_obligation_matrices")
@Data
@EqualsAndHashCode(exclude = {"business"})
@ToString(exclude = {"business"})
@SQLDelete(sql = "UPDATE business_obligation_matrices SET active = false WHERE id = ?")
@FilterDef(name = "deletedBusinessObligationMatrixFilter", parameters = @ParamDef(name = "isDeleted", type = boolean.class))
@Filter(name = "deletedBusinessObligationMatrixFilter", condition = "active = :isDeleted")
@Where(clause = "active = true")
public class BusinessObligationMatrix {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_id")
    private Business business;

    @ManyToOne
    @JoinColumn(name = "obligation_matrix_id")
    private ObligationMatrix obligationMatrix;

    private String name;
    private String obligationType;
    private String description;
    private String observations;
    private LocalDate dueDate;
    private String status;
    private String priority;
    private String responsiblePerson;
    private boolean completed;
    private LocalDateTime completionDate;
    private boolean active = true;
    
    @Column(name = "current_version")
    private Integer currentVersion = 1;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Métodos para manejar las fechas automáticamente
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.currentVersion == null || this.currentVersion <= 0) {
            this.currentVersion = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getDisplayName() {
        return this.name + " - " + this.description;
    }

    public String getObligationMatrixInfo() {
        return this.name + " - " + this.description;
    }

    private static final String DEFAULT_DESCRIPTION = "";

    public void setMatrixInfo(String obligationMatrixInfo) {
        String[] parts = obligationMatrixInfo.split("-", 2);
        if (parts.length > 1) {
            this.name = parts[0].trim();
            this.description = parts[1].trim();
        } else {
            this.name = obligationMatrixInfo.trim();
            this.description = DEFAULT_DESCRIPTION;
        }
    }

    public void setObligationMatrixInfo(String obligationMatrix) {
        if (obligationMatrix != null) {
            String[] parts = obligationMatrix.split(" - ", 2);
            if (parts.length > 1) {
                this.name = parts[0].trim();
                this.description = parts[1].trim();
            } else {
                this.name = obligationMatrix.trim();
                this.description = "";
            }
        }
    }
}
