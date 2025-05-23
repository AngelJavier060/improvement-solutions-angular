package com.improvementsolutions.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import lombok.*;


@Entity
@Table(name = "permissions")
@Data
@ToString(exclude = "roles")
@EqualsAndHashCode(exclude = "roles")
@NoArgsConstructor
@AllArgsConstructor
public class Permission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @ManyToMany(mappedBy = "permissions", fetch = FetchType.LAZY)
    private Set<Role> roles = new HashSet<>();

    // Helper methods
    public void addRole(Role role) {
        this.roles.add(role);
        if (!role.getPermissions().contains(this)) {
            role.getPermissions().add(this);
        }
    }

    public void removeRole(Role role) {
        this.roles.remove(role);
        if (role.getPermissions().contains(this)) {
            role.getPermissions().remove(this);
        }
    }
}
