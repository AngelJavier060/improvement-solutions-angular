package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un rol en el sistema
 */
@Entity
@Table(name = "roles")
@Data // Genera getters, setters, toString, equals, hashCode
@EqualsAndHashCode(exclude = {"users", "permissions"})
@ToString(exclude = {"users", "permissions"})
@NoArgsConstructor
@AllArgsConstructor
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String name;
    
    private String description;
    
    @ManyToMany(mappedBy = "roles", fetch = FetchType.LAZY)
    private Set<User> users = new HashSet<>();
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "role_permission",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @BatchSize(size = 20)
    private Set<Permission> permissions = new HashSet<>();
    
    // Métodos helper para mantener la bidireccionalidad
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
