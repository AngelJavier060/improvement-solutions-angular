package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Capacidades operativas por usuario.
 * El Superadministrador configura quién puede crear/editar/eliminar y módulos TH
 * (horas extra, vacaciones, permisos). Sin fila: defaults por rol.
 */
@Entity
@Table(name = "user_operational_capabilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserOperationalCapability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "can_view", nullable = false)
    @Builder.Default
    private boolean canView = true;

    @Column(name = "can_download", nullable = false)
    @Builder.Default
    private boolean canDownload = true;

    @Column(name = "can_create", nullable = false)
    @Builder.Default
    private boolean canCreate = false;

    @Column(name = "can_edit", nullable = false)
    @Builder.Default
    private boolean canEdit = false;

    @Column(name = "can_delete", nullable = false)
    @Builder.Default
    private boolean canDelete = false;

    @Column(name = "can_upload", nullable = false)
    @Builder.Default
    private boolean canUpload = false;

    /** Registrar solicitudes de horas extras. */
    @Column(name = "can_overtime", nullable = false)
    @Builder.Default
    private boolean canOvertime = false;

    /** Registrar solicitudes de vacaciones. */
    @Column(name = "can_vacations", nullable = false)
    @Builder.Default
    private boolean canVacations = false;

    /** Registrar solicitudes de permisos. */
    @Column(name = "can_time_off", nullable = false)
    @Builder.Default
    private boolean canTimeOff = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
