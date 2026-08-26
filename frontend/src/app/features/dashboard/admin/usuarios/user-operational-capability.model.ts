export interface UserOperationalCapability {
  userId: number;
  username?: string;
  name?: string;
  roleKind?: 'supervisor' | 'gestor' | 'administrador' | 'superadmin' | 'trabajador' | string;
  canView: boolean;
  canDownload: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUpload: boolean;
  canOvertime: boolean;
  canVacations: boolean;
  canTimeOff: boolean;
  writeLockedByRole: boolean;
  editable?: boolean;
  canWriteOps: boolean;
}
