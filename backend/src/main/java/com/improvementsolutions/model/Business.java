package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "businesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"users", "employees", "departments", "positions", "iessItems", "typeContracts", "typeDocuments"})
@ToString(exclude = {"users", "employees", "departments", "positions", "iessItems", "typeContracts", "typeDocuments"})
public class Business {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;
    
    @Column(length = 50)
    private String nameShort;
    
    @Column(nullable = false, unique = true)
    private String ruc;
    
    @Column(nullable = false)
    private String address;
    
    @Column(nullable = false)
    private String phone;
    
    private String secondaryPhone;
    
    @Column(nullable = false)
    private String email;
    
    private String website;
    private String description;
    private String tradeName;
    private String commercialActivity;
    
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
    private User createdBy;

    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BusinessEmployee> employees = new ArrayList<>();
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_department",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    private Set<Department> departments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_iess",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    private Set<Iess> iessItems = new HashSet<>();

    @ManyToMany(mappedBy = "businesses", fetch = FetchType.LAZY)
    private Set<User> users = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_position",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "position_id")
    )
    private Set<Position> positions = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_contract",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_contract_id")
    )
    private Set<TypeContract> typeContracts = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_document",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_document_id")
    )
    private Set<TypeDocument> typeDocuments = new HashSet<>();

    // Helper methods
    public void addEmployee(BusinessEmployee employee) {
        employees.add(employee);
        employee.setBusiness(this);
    }

    public void removeEmployee(BusinessEmployee employee) {
        employees.remove(employee);
        employee.setBusiness(null);
    }

    public void addUser(User user) {
        users.add(user);
        if (!user.getBusinesses().contains(this)) {
            user.getBusinesses().add(this);
        }
    }

    public void removeUser(User user) {
        users.remove(user);
        if (user.getBusinesses().contains(this)) {
            user.getBusinesses().remove(this);
        }
    }
    
    public void addTypeContract(TypeContract typeContract) {
        typeContracts.add(typeContract);
        if (!typeContract.getBusinesses().contains(this)) {
            typeContract.getBusinesses().add(this);
        }
    }

    public void removeTypeContract(TypeContract typeContract) {
        typeContracts.remove(typeContract);
        if (typeContract.getBusinesses().contains(this)) {
            typeContract.getBusinesses().remove(this);
        }
    }

    public void addTypeDocument(TypeDocument typeDocument) {
        typeDocuments.add(typeDocument);
        if (!typeDocument.getBusinesses().contains(this)) {
            typeDocument.getBusinesses().add(this);
        }
    }

    public void removeTypeDocument(TypeDocument typeDocument) {
        typeDocuments.remove(typeDocument);
        if (typeDocument.getBusinesses().contains(this)) {
            typeDocument.getBusinesses().remove(this);
        }
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.registrationDate == null) {
            this.registrationDate = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
