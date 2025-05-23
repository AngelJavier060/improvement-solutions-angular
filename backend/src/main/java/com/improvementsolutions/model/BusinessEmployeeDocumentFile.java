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
@Table(name = "business_employee_document_files")
@Data
@EqualsAndHashCode(exclude = {"businessEmployeeDocument"})
@ToString(exclude = {"businessEmployeeDocument"})
@SQLDelete(sql = "UPDATE business_employee_document_files SET active = false WHERE id = ?")
@FilterDef(name = "deletedBusinessEmployeeDocumentFileFilter", parameters = @ParamDef(name = "isDeleted", type = boolean.class))
@Filter(name = "deletedBusinessEmployeeDocumentFileFilter", condition = "active = :isDeleted")
public class BusinessEmployeeDocumentFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "id_business_employee_document")
    private BusinessEmployeeDocument businessEmployeeDocument;
    
    private String name;
    private String file;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
