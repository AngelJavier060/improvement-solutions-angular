package com.improvementsolutions.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserOperationalCapabilityDto {
    private Long userId;
    private String username;
    private String name;
    private String roleKind; // supervisor | gestor | administrador | superadmin | trabajador
    private boolean canView;
    private boolean canDownload;
    private boolean canCreate;
    private boolean canEdit;
    private boolean canDelete;
    private boolean canUpload;
    private boolean canOvertime;
    private boolean canVacations;
    private boolean canTimeOff;
    /** Solo Superadmin tiene escritura bloqueada (siempre todo). */
    private boolean writeLockedByRole;
    /** El caller puede editar esta fila en la matriz. */
    private boolean editable;
    private boolean canWriteOps;
}
