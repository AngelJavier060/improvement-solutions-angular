package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un empleado de una empresa
 */
@Entity
@Table(name = "business_employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    @ToString.Exclude
    private Business business;
    
    @Column(name = "first_name")
    private String firstName;
    
    @Column(name = "last_name")
    private String lastName;
    
    @Column(unique = true)
    private String cedula;
    
    private String phone;
    
    private String email;
    
    private String address;
    
    @Column(name = "date_birth")
    private LocalDate dateBirth;
    
    @Column(name = "date_entry")
    private LocalDate dateEntry;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne
    @JoinColumn(name = "gender_id")
    private Gender gender;
    
    @ManyToOne
    @JoinColumn(name = "civil_status_id")
    private CivilStatus civilStatus;
    
    @ManyToOne
    @JoinColumn(name = "ethnia_id")
    private Etnia etnia;
    
    private String status;
    
    @Column(name = "image_path")
    private String imagePath;
    
    @ManyToOne
    @JoinColumn(name = "resident_address_id")
    private ResidentAddress residentAddress;
    
    @ManyToOne
    @JoinColumn(name = "degree_id")
    private Degree degree;
    
    private String iess;
    
    @Column(name = "contact_kinship")
    private String contactKinship;
    
    @Column(name = "contact_name")
    private String contactName;
    
    @Column(name = "contact_phone")
    private String contactPhone;
    
    private String position;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    @ToString.Exclude
    private Employee employee;
    
    @OneToMany(mappedBy = "businessEmployee", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private Set<BusinessEmployeeContract> contracts = new HashSet<>();
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    public void setFullName(String fullName) {
        String[] parts = fullName.split(" ", 2);
        this.firstName = parts[0];
        this.lastName = parts.length > 1 ? parts[1] : "";
    }
    
    public void addContract(BusinessEmployeeContract contract) {
        contracts.add(contract);
        contract.setBusinessEmployee(this);
    }
    
    public void removeContract(BusinessEmployeeContract contract) {
        contracts.remove(contract);
        contract.setBusinessEmployee(null);
    }
    
    public void setEmployee(Employee employee) {
        this.employee = employee;
    }
    
    public Employee getEmployee() {
        return this.employee;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getStatus() {
        return status;
    }
    
    public String getIess() {
        return iess;
    }
    
    public void setIess(String iess) {
        this.iess = iess;
    }
    
    public String getImage() {
        return imagePath;
    }
    
    public void setImage(String imagePath) {
        this.imagePath = imagePath;
    }
    
    public String getGender() {
        return gender.getName();
    }
    
    public void setGender(Gender gender) {
        this.gender = gender;
    }
    
    public String getContactKinship() {
        return contactKinship;
    }
    
    public void setContactKinship(String contactKinship) {
        this.contactKinship = contactKinship;
    }
    
    public String getContactName() {
        return contactName;
    }
    
    public void setContactName(String contactName) {
        this.contactName = contactName;
    }
    
    public String getContactPhone() {
        return contactPhone;
    }
    
    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }
    
    public String getCivilStatus() {
        return civilStatus.getName();
    }
    
    public void setCivilStatus(CivilStatus civilStatus) {
        this.civilStatus = civilStatus;
    }
}