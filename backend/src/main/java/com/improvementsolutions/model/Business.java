package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;

@Entity
@Table(name = "businesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems", "businessObligationMatrices", "contractorCompanies", "contractorBlocks", "courseCertifications", "cards"})
@ToString(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems", "businessObligationMatrices", "contractorCompanies", "contractorBlocks", "courseCertifications", "cards"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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
        name = "business_course_certification",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "course_certification_id")
    )
    @JsonIgnore
    private Set<CourseCertification> courseCertifications = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_card",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "card_id")
    )
    @JsonIgnore
    private Set<CardCatalog> cards = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_iess",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    @JsonIgnore
    private Set<Iess> iessItems = new HashSet<>();

    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL, orphanRemoval = true)
    @Where(clause = "active = true")
    @JsonIgnore
    private List<BusinessObligationMatrix> businessObligationMatrices = new ArrayList<>();

    // Relaciones con empresas contratistas
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_contractor_companies",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "contractor_company_id")
    )
    private List<ContractorCompany> contractorCompanies = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_contractor_blocks",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "contractor_block_id")
    )
    private List<ContractorBlock> contractorBlocks = new ArrayList<>();

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

    public void addBusinessObligationMatrix(BusinessObligationMatrix businessObligationMatrix) {
        businessObligationMatrices.add(businessObligationMatrix);
        businessObligationMatrix.setBusiness(this);
    }

    public void removeBusinessObligationMatrix(BusinessObligationMatrix businessObligationMatrix) {
        businessObligationMatrices.remove(businessObligationMatrix);
        businessObligationMatrix.setBusiness(null);
    }

    // Métodos para empresas contratistas
    public void addContractorBlock(ContractorBlock contractorBlock) {
        if (contractorBlocks == null) {
            contractorBlocks = new ArrayList<>();
        }
        contractorBlocks.add(contractorBlock);
    }

    public void removeContractorBlock(ContractorBlock contractorBlock) {
        if (contractorBlocks != null) {
            contractorBlocks.remove(contractorBlock);
        }
    }

    public void setContractorBlocks(List<ContractorBlock> contractorBlocks) {
        this.contractorBlocks = contractorBlocks != null ? contractorBlocks : new ArrayList<>();
    }
    
    // Métodos para empresas contratistas múltiples
    public void addContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies == null) {
            contractorCompanies = new ArrayList<>();
        }
        if (!contractorCompanies.contains(contractorCompany)) {
            contractorCompanies.add(contractorCompany);
        }
    }

    public void removeContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies != null) {
            contractorCompanies.remove(contractorCompany);
        }
    }

    public void setContractorCompanies(List<ContractorCompany> contractorCompanies) {
        this.contractorCompanies = contractorCompanies != null ? contractorCompanies : new ArrayList<>();
    }
    
    // Métodos de compatibilidad hacia atrás para contractorCompany (singular)
    @Transient
    public ContractorCompany getContractorCompany() {
        return (contractorCompanies != null && !contractorCompanies.isEmpty()) 
            ? contractorCompanies.get(0) 
            : null;
    }
    
    @Transient  
    public void setContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies == null) {
            contractorCompanies = new ArrayList<>();
        } else {
            contractorCompanies.clear();
        }
        if (contractorCompany != null) {
            contractorCompanies.add(contractorCompany);
        }
    }

    // Nuevos helpers para catálogos por empresa
    public void addCourseCertification(CourseCertification cc) {
        courseCertifications.add(cc);
    }

    public void removeCourseCertification(CourseCertification cc) {
        courseCertifications.remove(cc);
    }

    public void addCard(CardCatalog card) {
        cards.add(card);
    }

    public void removeCard(CardCatalog card) {
        cards.remove(card);
    }
}
