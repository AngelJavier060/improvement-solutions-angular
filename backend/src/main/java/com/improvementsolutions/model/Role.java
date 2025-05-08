package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un rol en el sistema
 */
@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String name;
    
    private String description;
    
    @ManyToMany(mappedBy = "roles")
    @ToString.Exclude // Evitamos referencias circulares
    private Set<User> users = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @ToString.Exclude
    private Set<Permission> permissions = new HashSet<>();
    
    // Métodos de utilidad para gestionar relaciones bidireccionales
    public void addUser(User user) {
        this.users.add(user);
        if (!user.getRoles().contains(this)) {
            user.getRoles().add(this);
        }
    }
    
    public void removeUser(User user) {
        this.users.remove(user);
        if (user.getRoles().contains(this)) {
            user.getRoles().remove(this);
        }
    }
    
    public void addPermission(Permission permission) {
        this.permissions.add(permission);
        if (!permission.getRoles().contains(this)) {
            permission.getRoles().add(this);
        }
    }
    
    public void removePermission(Permission permission) {
        this.permissions.remove(permission);
        if (permission.getRoles().contains(this)) {
            permission.getRoles().remove(this);
        }
    }
}