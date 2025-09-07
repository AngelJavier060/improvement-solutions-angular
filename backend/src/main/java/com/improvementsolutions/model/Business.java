package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "businesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems"})
@ToString(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems"})
public class Business {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "name_short")
    private String nameShort;
    
    @Column(nullable = false, unique = true)
    private String ruc;
    
    @Column(nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String phone;
    
    @Column(name = "secondary_phone")
    private String secondaryPhone;
    
    private String address;
    private String website;
    private String description;
    
    @Column(name = "commercial_activity")
    private String commercialActivity;
    
    @Column(name = "trade_name")
    private String tradeName;
    
    @Column(name = "legal_representative", nullable = false)
    private String legalRepresentative;
    
    private String logo;
    
    private boolean active = true;
    
    @Column(name = "registration_date")
    private LocalDateTime registrationDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<BusinessEmployee> employees = new ArrayList<>();
    
    @ManyToMany(mappedBy = "businesses", fetch = FetchType.LAZY)
    private Set<User> users = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_position",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "position_id")
    )
    @JsonIgnore
    private Set<Position> positions = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_contract",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_contract_id")
    )
    @JsonIgnore
    private Set<TypeContract> typeContracts = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_document",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_document_id")
    )
    @JsonIgnore
    private Set<TypeDocument> typeDocuments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_department",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    @JsonIgnore
    private Set<Department> departments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_iess",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    @JsonIgnore
    private Set<Iess> iessItems = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.registrationDate == null) {
            this.registrationDate = LocalDateTime.now();
        }
        if (this.nameShort == null || this.nameShort.trim().isEmpty()) {
            this.nameShort = this.name.substring(0, Math.min(this.name.length(), 50));
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addEmployee(BusinessEmployee employee) {
        employees.add(employee);
        employee.setBusiness(this);
    }

    public void removeEmployee(BusinessEmployee employee) {
        employees.remove(employee);
        employee.setBusiness(null);
    }

    public void addDepartment(Department department) {
        departments.add(department);
        department.getBusinesses().add(this);
    }

    public void removeDepartment(Department department) {
        departments.remove(department);
        department.getBusinesses().remove(this);
    }

    public void addTypeContract(TypeContract typeContract) {
        typeContracts.add(typeContract);
        typeContract.getBusinesses().add(this);
    }

    public void removeTypeContract(TypeContract typeContract) {
        typeContracts.remove(typeContract);
        typeContract.getBusinesses().remove(this);
    }

    public void addTypeDocument(TypeDocument typeDocument) {
        typeDocuments.add(typeDocument);
        typeDocument.getBusinesses().add(this);
    }

    public void removeTypeDocument(TypeDocument typeDocument) {
        typeDocuments.remove(typeDocument);
        typeDocument.getBusinesses().remove(this);
    }

    public void addIessItem(Iess iessItem) {
        iessItems.add(iessItem);
        iessItem.getBusinesses().add(this);
    }

    public void removeIessItem(Iess iessItem) {
        iessItems.remove(iessItem);
        iessItem.getBusinesses().remove(this);
    }

    public void addPosition(Position position) {
        positions.add(position);
        position.getBusinesses().add(this);
    }

    public void removePosition(Position position) {
        positions.remove(position);
        position.getBusinesses().remove(this);
    }
}
