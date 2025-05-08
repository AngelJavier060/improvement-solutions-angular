package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un usuario del sistema
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(unique = true)
    private String email;
    
    private String name;
    
    // Añadir campo phone
    private String phone;
    
    private Boolean active = true;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @ToString.Exclude // Evitamos referencias circulares
    private Set<Role> roles = new HashSet<>();
    
    // Relación con Business con anotación para evitar problemas circulares
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_businesses",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "business_id")
    )
    @ToString.Exclude // Evitamos referencias circulares
    private Set<Business> businesses = new HashSet<>();
    
    // Métodos de utilidad
    public void addRole(Role role) {
        this.roles.add(role);
        role.getUsers().add(this);
    }
    
    public void addBusiness(Business business) {
        this.businesses.add(business);
        business.getUsers().add(this);
    }
    
    public void removeRole(Role role) {
        this.roles.remove(role);
        role.getUsers().remove(this);
    }
    
    public void removeBusiness(Business business) {
        this.businesses.remove(business);
        business.getUsers().remove(this);
    }
    
    public boolean hasRole(String roleName) {
        return this.roles.stream()
                .anyMatch(role -> role.getName().equals(roleName));
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