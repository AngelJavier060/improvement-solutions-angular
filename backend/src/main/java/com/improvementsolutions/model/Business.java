package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "businesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String ruc;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_short")
    private String nameShort;

    @Column(name = "representative_legal")
    private String representativeLegal;

    private String email;
    
    private String address;
    
    private String phone;
    
    private String logo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relación muchos a muchos con User
    @ManyToMany(mappedBy = "businesses")
    private Set<User> users = new HashSet<>();

    // Relación uno a muchos con BusinessEmployee
    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL)
    private Set<BusinessEmployee> employees = new HashSet<>();

    // Relación muchos a muchos con TypeDocument
    @ManyToMany
    @JoinTable(
            name = "business_type_document",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "type_document_id")
    )
    private Set<TypeDocument> typeDocuments = new HashSet<>();

    // Relación muchos a muchos con Department
    @ManyToMany
    @JoinTable(
            name = "business_department",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    private Set<Department> departments = new HashSet<>();

    // Relación muchos a muchos con Position
    @ManyToMany
    @JoinTable(
            name = "business_position",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "position_id")
    )
    private Set<Position> positions = new HashSet<>();

    // Relación muchos a muchos con Iess
    @ManyToMany
    @JoinTable(
            name = "business_iess",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    private Set<Iess> ieses = new HashSet<>();

    // Relación muchos a muchos con TypeContract
    @ManyToMany
    @JoinTable(
            name = "business_type_contract",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "type_contract_id")
    )
    private Set<TypeContract> typeContracts = new HashSet<>();

    // Relación uno a muchos con BusinessObligationMatrix
    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL)
    private Set<BusinessObligationMatrix> obligationMatrices = new HashSet<>();
}