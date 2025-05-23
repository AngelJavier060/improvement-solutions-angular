package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un usuario del sistema
 */
@Entity
@Table(name = "users")
@Data // Genera getters, setters, toString, equals, hashCode
@EqualsAndHashCode(exclude = {"roles", "businesses"})
@ToString(exclude = {"roles", "businesses"})
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
    private String phone;
    private Boolean active = true;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @BatchSize(size = 20)
    private Set<Role> roles = new HashSet<>();
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_businesses",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "business_id")
    )
    @BatchSize(size = 20)
    private Set<Business> businesses = new HashSet<>();
    
    // Métodos helper
    public void addRole(Role role) {
        this.roles.add(role);
        if (!role.getUsers().contains(this)) {
            role.getUsers().add(this);
        }
    }
    
    public void removeRole(Role role) {
        this.roles.remove(role);
        if (role.getUsers().contains(this)) {
            role.getUsers().remove(this);
        }
    }

    public void addBusiness(Business business) {
        this.businesses.add(business);
        if (!business.getUsers().contains(this)) {
            business.getUsers().add(this);
        }
    }
    
    public void removeBusiness(Business business) {
        this.businesses.remove(business);
        if (business.getUsers().contains(this)) {
            business.getUsers().remove(this);
        }
    }
    
    public boolean hasRole(String roleName) {
        return this.roles.stream()
                .anyMatch(role -> role.getName().equals(roleName));
    }
    
    // Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    public boolean isActive() {
        return this.active != null && this.active;
    }
    
    public boolean isEnabled() {
        return active;
    }

    public void setEnabled(boolean enabled) {
        this.active = enabled;
    }

    public boolean isLocked() {
        return !active;
    }

    public void setLocked(boolean locked) {
        this.active = !locked;
    }
}
