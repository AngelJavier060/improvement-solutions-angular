package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.annotations.Filter;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "business_employee_documents")
@Data
@EqualsAndHashCode(exclude = {"businessEmployee", "files"})
@ToString(exclude = {"businessEmployee", "files"})
@SQLDelete(sql = "UPDATE business_employee_documents SET active = false WHERE id = ?")
@FilterDef(name = "deletedBusinessEmployeeDocumentFilter", parameters = @ParamDef(name = "isDeleted", type = boolean.class))
@Filter(name = "deletedBusinessEmployeeDocumentFilter", condition = "active = :isDeleted")
public class BusinessEmployeeDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_employee_id")
    private BusinessEmployee businessEmployee;

    @ManyToOne
    @JoinColumn(name = "type_document_id")
    private TypeDocument typeDocument;

    private String documentType;
    private String documentUrl;
    private LocalDateTime uploadDate;
    private String description;
    private boolean active = true;

    @OneToMany(mappedBy = "businessEmployeeDocument", cascade = CascadeType.ALL)
    private List<BusinessEmployeeDocumentFile> files = new ArrayList<>();

    private String name;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public TypeDocument getTypeDocument() {
        return typeDocument;
    }

    public void setTypeDocument(TypeDocument typeDocument) {
        this.typeDocument = typeDocument;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
