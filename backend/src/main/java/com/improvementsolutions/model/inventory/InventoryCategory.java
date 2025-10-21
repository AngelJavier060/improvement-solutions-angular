package com.improvementsolutions.model.inventory;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.improvementsolutions.model.Business;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnore
    private Business business;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(name = "active")
    private Boolean active = true;

    // Jerarquía de categorías (opcional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private InventoryCategory parent;

    @Column(name = "level")
    private Integer level; // 1,2,3...

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (active == null) active = true;
        if (level == null) level = (parent == null ? 1 : (parent.getLevel() == null ? 1 : parent.getLevel() + 1));
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
