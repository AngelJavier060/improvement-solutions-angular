package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "site_visit_counters")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SiteVisitCounter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "counter_key", nullable = false, unique = true, length = 64)
    private String counterKey;

    @Column(nullable = false)
    private Long total = 0L;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = LocalDateTime.now();
        if (this.total == null) {
            this.total = 0L;
        }
    }
}
