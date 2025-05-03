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
@Table(name = "business_employees")
@SQLDelete(sql = "UPDATE business_employees SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private String name;

    private String status;

    private String phone;

    private LocalDate birthdate;

    private String address;

    private String email;

    @Column(name = "contact_kinship")
    private String contactKinship;

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_phone")
    private String contactPhone;

    @ManyToOne
    @JoinColumn(name = "position_id")
    private Position position;

    @ManyToOne
    @JoinColumn(name = "gender_id")
    private Gender gender;

    @ManyToOne
    @JoinColumn(name = "etnia_id")
    private Etnia etnia;

    @ManyToOne
    @JoinColumn(name = "civil_status_id")
    private CivilStatus civilStatus;

    @ManyToOne
    @JoinColumn(name = "resident_address_id")
    private ResidentAddress residentAddress;

    @ManyToOne
    @JoinColumn(name = "degree_id")
    private Degree degree;

    @ManyToOne
    @JoinColumn(name = "iess_id")
    private Iess iess;

    private String cedula;

    private String image;

    @OneToOne
    @JoinColumn(name = "business_employee_contract_id")
    private BusinessEmployeeContract currentContract;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Relaciones adicionales
    @OneToMany(mappedBy = "businessEmployee", cascade = CascadeType.ALL)
    private Set<BusinessEmployeeRecord> records = new HashSet<>();

    @OneToMany(mappedBy = "businessEmployee", cascade = CascadeType.ALL)
    private Set<BusinessEmployeeContract> contracts = new HashSet<>();

    @OneToMany(mappedBy = "businessEmployee", cascade = CascadeType.ALL)
    private Set<BusinessEmployeeDocument> documents = new HashSet<>();
}