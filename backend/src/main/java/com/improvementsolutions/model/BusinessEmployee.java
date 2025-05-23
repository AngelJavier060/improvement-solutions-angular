package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "business_employees")
@Data
@EqualsAndHashCode(exclude = {"business", "gender", "civilStatus", "etnia", "degree", "contracts"})
@ToString(exclude = {"business", "gender", "civilStatus", "etnia", "degree", "contracts"})
public class BusinessEmployee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String cedula;
    private String name;
    private String phone;
    private LocalDateTime dateBirth;
    private String address;
    private String email;
    private String position;
    private String residentAddress;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id")
    private Business business;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gender_id")
    private Gender gender;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "civil_status_id")
    private CivilStatus civilStatus;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "etnia_id")
    private Etnia etnia;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "degree_id")
    private Degree degree;
    
    @OneToMany(mappedBy = "businessEmployee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BusinessEmployeeContract> contracts = new ArrayList<>();
    
    private String contactName;
    private String contactPhone;
    private String contactKinship;
    private String iess;
    private String status;
    private String image;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    public String getFullName() {
        return name;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getIess() {
        return iess;
    }

    public void setIess(String iess) {
        this.iess = iess;
    }

    public String getStatus() {
        return status;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
}
