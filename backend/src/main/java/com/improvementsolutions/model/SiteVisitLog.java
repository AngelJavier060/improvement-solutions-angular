package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Registro técnico de visitas a la landing (auditoría / seguridad).
 * No guarda datos de formularios ni credenciales.
 */
@Entity
@Table(name = "site_visit_logs", indexes = {
        @Index(name = "idx_site_visit_logs_created", columnList = "created_at"),
        @Index(name = "idx_site_visit_logs_ip", columnList = "ip_address")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SiteVisitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "referer", length = 512)
    private String referer;

    @Column(name = "accept_language", length = 120)
    private String acceptLanguage;

    @Column(name = "path", length = 120)
    private String path;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
