/**
 * Tipología de usuarios de empresa / plataforma.
 *
 * - Superadministrador (ROLE_SUPER_ADMIN): plataforma.
 * - Administrador de empresa (ROLE_ADMIN): parámetros/catálogos, designa Gestores/Supervisores y opera documentos/cursos/tarjetas.
 * - Gestor operativo (ROLE_MANAGER): subir/editar/eliminar docs y operación (TH, flota…).
 * - Gestor operativo (ROLE_MANAGER): subir/editar/eliminar docs y operación (TH, flota…).
 * - Supervisor (ROLE_USER): solo ver y descargar.
 * - Trabajador (ROLE_EMPLOYEE): portal propio.
 */

export type AdminUserKind =
  | 'superadmin'
  | 'admin_empresa'
  | 'gestor'
  | 'supervisor'
  | 'trabajador'
  | 'otro';

/** @deprecated usar 'supervisor' */
export type LegacyConsultaKind = 'usuario_consulta';

export function resolveUserKind(roles: string[] | null | undefined): AdminUserKind {
  const r = roles || [];
  if (r.includes('ROLE_SUPER_ADMIN')) return 'superadmin';
  if (r.includes('ROLE_ADMIN')) return 'admin_empresa';
  if (r.includes('ROLE_EMPLOYEE')) return 'trabajador';
  if (r.includes('ROLE_MANAGER')) return 'gestor';
  if (r.includes('ROLE_USER')) return 'supervisor';
  return 'otro';
}

export function userKindLabel(kind: AdminUserKind | 'usuario_consulta'): string {
  switch (kind) {
    case 'superadmin':
      return 'Superadministrador';
    case 'admin_empresa':
      return 'Administrador de empresa';
    case 'gestor':
      return 'Gestor operativo';
    case 'supervisor':
    case 'usuario_consulta':
      return 'Supervisor';
    case 'trabajador':
      return 'Trabajador';
    default:
      return 'Otro';
  }
}

export function userKindBadgeClass(kind: AdminUserKind | 'usuario_consulta'): string {
  switch (kind) {
    case 'superadmin':
      return 'bg-danger';
    case 'admin_empresa':
      return 'bg-dark';
    case 'gestor':
      return 'bg-primary';
    case 'supervisor':
    case 'usuario_consulta':
      return 'bg-info';
    case 'trabajador':
      return 'bg-success';
    default:
      return 'bg-secondary';
  }
}

export function userKindShortHelp(kind: AdminUserKind | 'usuario_consulta'): string {
  switch (kind) {
    case 'superadmin':
      return 'Acceso total a la plataforma. No se gestiona desde este formulario.';
    case 'admin_empresa':
      return 'Configura parámetros de su empresa y designa Gestores / Supervisores.';
    case 'gestor':
      return 'Puede subir, editar y eliminar documentación y operación (trabajadores, vehículos, etc.).';
    case 'supervisor':
    case 'usuario_consulta':
      return 'Solo puede ver y descargar documentación; no edita ni elimina.';
    case 'trabajador':
      return 'Accede a su portal para revisar solo su documentación.';
    default:
      return '';
  }
}

export function formatRoleName(role: string): string {
  switch (role) {
    case 'ROLE_SUPER_ADMIN':
      return 'Superadministrador';
    case 'ROLE_ADMIN':
      return 'Administrador de empresa';
    case 'ROLE_MANAGER':
      return 'Gestor operativo';
    case 'ROLE_USER':
      return 'Supervisor';
    case 'ROLE_EMPLOYEE':
      return 'Trabajador';
    default:
      return (role || '').replace(/^ROLE_/, '') || role;
  }
}

/** Puede escribir en módulos /usuario/... (Admin o Gestor). */
export function canWriteRoles(roles: string[] | null | undefined): boolean {
  const r = roles || [];
  return r.includes('ROLE_SUPER_ADMIN')
    || r.includes('ROLE_ADMIN')
    || r.includes('ROLE_MANAGER');
}

/** Solo consulta: Supervisor sin privilegios de escritura. */
export function isConsultaRoles(roles: string[] | null | undefined): boolean {
  const r = roles || [];
  return r.includes('ROLE_USER') && !canWriteRoles(r);
}
