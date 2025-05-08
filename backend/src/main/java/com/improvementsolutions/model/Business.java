package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

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
    @ToString.Exclude
    private Set<User> users = new HashSet<>();

    // Relación uno a muchos con BusinessEmployee
    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL)
    @ToString.Exclude
    private Set<BusinessEmployee> employees = new HashSet<>();

    // Relación muchos a muchos con TypeDocument
    @ManyToMany
    @JoinTable(
            name = "business_type_document",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "type_document_id")
    )
    @ToString.Exclude
    private Set<TypeDocument> typeDocuments = new HashSet<>();

    // Relación muchos a muchos con Department
    @ManyToMany
    @JoinTable(
            name = "business_department",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    @ToString.Exclude
    private Set<Department> departments = new HashSet<>();

    // Relación muchos a muchos con Position
    @ManyToMany
    @JoinTable(
            name = "business_position",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "position_id")
    )
    @ToString.Exclude
    private Set<Position> positions = new HashSet<>();

    // Relación muchos a muchos con Iess - Cambiamos el nombre de la colección de 'ieses' a 'iessItems'
    @ManyToMany
    @JoinTable(
            name = "business_iess",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    @ToString.Exclude
    private Set<Iess> iessItems = new HashSet<>();

    // Relación muchos a muchos con TypeContract
    @ManyToMany
    @JoinTable(
            name = "business_type_contract",
            joinColumns = @JoinColumn(name = "business_id"),
            inverseJoinColumns = @JoinColumn(name = "type_contract_id")
    )
    @ToString.Exclude
    private Set<TypeContract> typeContracts = new HashSet<>();

    // Relación uno a muchos con BusinessObligationMatrix
    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL)
    @ToString.Exclude
    private Set<BusinessObligationMatrix> obligationMatrices = new HashSet<>();
    
    // Métodos de utilidad para gestionar relaciones bidireccionales
    public void addUser(User user) {
        this.users.add(user);
        if (!user.getBusinesses().contains(this)) {
            user.getBusinesses().add(this);
        }
    }
    
    public void removeUser(User user) {
        this.users.remove(user);
        if (user.getBusinesses().contains(this)) {
            user.getBusinesses().remove(this);
        }
    }
    
    public void addEmployee(BusinessEmployee employee) {
        this.employees.add(employee);
        if (employee.getBusiness() != this) {
            employee.setBusiness(this);
        }
    }
    
    public void removeEmployee(BusinessEmployee employee) {
        this.employees.remove(employee);
        if (employee.getBusiness() == this) {
            employee.setBusiness(null);
        }
    }
    
    // Métodos para manejar las fechas automáticamente
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}