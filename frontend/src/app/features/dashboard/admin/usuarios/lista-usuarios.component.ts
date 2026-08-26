import { Component, OnInit, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserAdminService } from './user-admin.service';
import { User } from '../../../../models/user.model';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';
import { ImageCacheService } from '../../../../services/image-cache.service';
import { CarnetDigitalComponent } from './carnet-digital/carnet-digital.component';
import { Business } from '../../../../models/business.model';
import { BusinessService } from '../../../../services/business.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  formatRoleName,
  resolveUserKind,
  userKindBadgeClass,
  userKindLabel,
  AdminUserKind
} from './user-role.utils';
import { UserOperationalCapability } from './user-operational-capability.model';

@Component({
  selector: 'app-lista-usuarios',
  templateUrl: './lista-usuarios.component.html',
  styleUrls: ['./lista-usuarios.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListaUsuariosComponent implements OnInit {  
  users: User[] = [];
  filteredUsers: User[] = [];
  pagedUsers: User[] = []; // Nueva propiedad para usuarios paginados
  isLoading = true;
  // Estado de error para usuarios y empresas
  errorUsersCode: number | null = null;
  errorUsersMessage: string = '';
  errorBusinessesCode: number | null = null;
  errorBusinessesMessage: string = '';
  searchText = '';
  /** Filtros alineados a tipología Fase A (consulta / admin empresa / todos) */
  userTypeFilter: 'todos' | 'empresa' | 'supervisor' | 'gestor' | 'administrador' | 'trabajador' = 'supervisor';
  // Empresas para filtro
  businesses: Business[] = [];
  selectedBusinessId: number | 'all' = 'all';
  page = 1;
  pageSize = 10;
  environment = environment;

  // Rol del usuario actual
  isSuperAdmin = false;
  isCompanyAdmin = false;
  companyAdminBusinessId: number | null = null;

  /** Matriz de permisos operativos (por empresa seleccionada). */
  capabilityRows: UserOperationalCapability[] = [];
  capabilitiesLoading = false;
  capabilitiesError = '';
  savingCapabilityUserId: number | null = null;

  // Variable para almacenar las URLs de imágenes de perfil
  private profileImageUrls: Map<number, string> = new Map();
  // Cache de empresa por usuario (muestra "RUC - Nombre")
  private userBusinessCache: Map<number, string> = new Map();
  private userBusinessLoading: Set<number> = new Set();
  private userBusinessIdMap: Map<number, number> = new Map();

  constructor(
    private userService: UserAdminService,
    private modalService: NgbModal,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private imageCacheService: ImageCacheService,
    private businessService: BusinessService,
    private authService: AuthService
  ) { }
  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const roles: string[] = user?.roles || [];
    this.isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
    this.isCompanyAdmin = roles.includes('ROLE_ADMIN') && !this.isSuperAdmin;

    if (this.isCompanyAdmin && user?.businesses?.length > 0) {
      // Admin de empresa: bloquear a su empresa
      this.companyAdminBusinessId = user.businesses[0].id;
      this.selectedBusinessId = user.businesses[0].id;
    }

    this.loadBusinesses();
    this.loadUsers();
  }

  // Evitar recrear DOM en *ngFor y minimizar titileo de imágenes
  trackByUserId(index: number, user: User): number {
    return user?.id ?? index;
  }
  
  // Cargar empresas para el filtro del listado (dropdown)
  loadBusinesses(): void {
    this.businessService.getAll().subscribe({
      next: (data) => {
        this.businesses = data || [];
        this.errorBusinessesCode = null;
        this.errorBusinessesMessage = '';

        // Si es admin de empresa, filtrar solo su empresa
        if (this.isCompanyAdmin && this.companyAdminBusinessId != null) {
          this.businesses = this.businesses.filter(
            b => b.id != null && Number(b.id) === this.companyAdminBusinessId
          );
        } else if (this.businesses.length === 1 && this.selectedBusinessId === 'all') {
          // Si solo hay una empresa, seleccionarla automáticamente
          const only = this.businesses[0];
          if (only && only.id != null) {
            this.selectedBusinessId = Number(only.id);
            this.loadUsers(); // re-fetch con la empresa seleccionada
          }
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar empresas', err);
        this.businesses = [];
        this.errorBusinessesCode = Number(err?.status) || null;
        if (this.errorBusinessesCode === 401) {
          this.errorBusinessesMessage = 'No autenticado. Por favor, vuelve a iniciar sesión.';
        } else if (this.errorBusinessesCode === 403) {
          this.errorBusinessesMessage = 'No tienes permisos para consultar las empresas.';
        } else if (this.errorBusinessesCode === 500) {
          this.errorBusinessesMessage = 'Error del servidor al obtener empresas. Intenta nuevamente.';
        } else {
          this.errorBusinessesMessage = (err?.error?.message) || 'No se pudieron cargar las empresas.';
        }
        this.cdr.markForCheck();
      }
    });
  }
  
  ngOnChanges(): void {
    this.updatePagedUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    // Limpiar caches al recargar
    this.userBusinessCache.clear();
    this.userBusinessLoading.clear();
    this.userBusinessIdMap.clear();
    this.profileImageUrls.clear();

    // Determinar si cargar todos o por empresa
    const fetch$ = (this.selectedBusinessId !== 'all')
      ? this.userService.getUsersByBusiness(Number(this.selectedBusinessId))
      : this.userService.getUsers();

    fetch$.subscribe({
      next: (data) => {
        // Admin de empresa: no listar Superadministradores (fuera de alcance de esta pantalla)
        const raw = data || [];
        this.users = this.isCompanyAdmin
          ? raw.filter(u => !(u.roles || []).includes('ROLE_SUPER_ADMIN'))
          : raw;
        this.errorUsersCode = null;
        this.errorUsersMessage = '';
        this.applyFilter();
        this.isLoading = false;
        this.loadCapabilitiesMatrix();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar usuarios', error);
        this.users = [];
        this.filteredUsers = [];
        this.isLoading = false;
        this.capabilityRows = [];
        this.errorUsersCode = Number(error?.status) || null;
        if (this.errorUsersCode === 401) {
          this.errorUsersMessage = 'Tu sesión ha expirado o no estás autenticado. Por favor, vuelve a iniciar sesión.';
        } else if (this.errorUsersCode === 403) {
          this.errorUsersMessage = 'No tienes permisos para ver la lista de usuarios. Requiere rol de Administrador.';
        } else if (this.errorUsersCode === 500) {
          this.errorUsersMessage = 'Ocurrió un error interno al obtener usuarios. Intenta nuevamente.';
        } else {
          this.errorUsersMessage = (error?.error?.message) || 'No se pudo cargar la lista de usuarios.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  // Cuando cambia la empresa seleccionada, re-fetch desde el servidor
  onBusinessChange(): void {
    this.loadUsers();
    this.loadCapabilitiesMatrix();
  }

  loadCapabilitiesMatrix(): void {
    this.capabilitiesError = '';
    if (this.selectedBusinessId === 'all') {
      this.capabilityRows = [];
      this.capabilitiesLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.capabilitiesLoading = true;
    this.userService.getCapabilitiesByBusiness(Number(this.selectedBusinessId)).subscribe({
      next: (rows) => {
        this.capabilityRows = rows || [];
        this.capabilitiesLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.capabilityRows = [];
        this.capabilitiesLoading = false;
        this.capabilitiesError = err?.error?.message || 'No se pudo cargar la matriz de permisos';
        this.cdr.markForCheck();
      }
    });
  }

  roleKindLabel(kind?: string): string {
    switch (kind) {
      case 'supervisor': return 'Supervisor';
      case 'gestor': return 'Gestor';
      case 'administrador': return 'Administrador';
      default: return kind || '-';
    }
  }

  onCapabilityToggle(
    row: UserOperationalCapability,
    field: 'canDownload' | 'canCreate' | 'canEdit' | 'canDelete' | 'canUpload' | 'canOvertime' | 'canVacations' | 'canTimeOff',
    event: Event
  ): void {
    if (row.writeLockedByRole || row.editable === false) {
      (event.target as HTMLInputElement).checked = !!row[field];
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    row[field] = checked;
    this.savingCapabilityUserId = row.userId;
    this.userService.updateUserCapabilities(row.userId, {
      canDownload: row.canDownload,
      canCreate: row.canCreate,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
      canUpload: row.canUpload,
      canOvertime: !!row.canOvertime,
      canVacations: !!row.canVacations,
      canTimeOff: !!row.canTimeOff
    }).subscribe({
      next: (updated) => {
        Object.assign(row, updated);
        this.savingCapabilityUserId = null;
        this.notificationService.success(`Permisos actualizados para ${row.username || row.name}`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingCapabilityUserId = null;
        this.loadCapabilitiesMatrix();
        this.notificationService.error(err?.error?.message || 'No se pudo guardar el permiso');
        this.cdr.markForCheck();
      }
    });
  }

  isCapabilityEditable(row: UserOperationalCapability): boolean {
    if (row.writeLockedByRole) return false;
    if (typeof row.editable === 'boolean') return row.editable;
    // Fallback: Super puede todo; Admin empresa solo supervisores
    if (this.isSuperAdmin) return true;
    return this.isCompanyAdmin && row.roleKind === 'supervisor';
  }
  // Agregamos un temporizador para optimizar la búsqueda
  private searchTimeout: any = null;

  onSearchInputChange(): void {
    // Limpia el temporizador anterior si existe
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Establece un nuevo temporizador para retrasar la búsqueda
    this.searchTimeout = setTimeout(() => {
      this.applyFilter();
    }, 300); // Espera 300ms después de que el usuario deje de escribir
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilter();
  }

  applyFilter(): void {
    // Reiniciar a la primera página al aplicar filtros
    this.page = 1;
    const searchLower = this.searchText.toLowerCase().trim();
    const base = searchLower === ''
      ? [...this.users]
      : this.users.filter(user =>
          (user.name || '').toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );

    // Filtrar por tipología (sin mezclar Usuario consulta vs Trabajador vs Admin)
    if (this.userTypeFilter === 'empresa' || this.userTypeFilter === 'supervisor') {
      this.filteredUsers = base.filter(u => resolveUserKind(u.roles) === 'supervisor');
    } else if (this.userTypeFilter === 'gestor') {
      this.filteredUsers = base.filter(u => resolveUserKind(u.roles) === 'gestor');
    } else if (this.userTypeFilter === 'administrador') {
      this.filteredUsers = base.filter(u => resolveUserKind(u.roles) === 'admin_empresa');
    } else if (this.userTypeFilter === 'trabajador') {
      this.filteredUsers = base.filter(u => resolveUserKind(u.roles) === 'trabajador');
    } else {
      this.filteredUsers = base;
    }

    // El filtrado por empresa ahora es server-side (loadUsers ya trae solo los de la empresa seleccionada)
    this.updatePagedUsers();
  }

  // Helpers para UI: contadores por tipo
  get totalUsuarios(): number {
    return this.users.length;
  }

  get totalAdministradores(): number {
    return this.users.filter(u => resolveUserKind(u.roles) === 'admin_empresa').length;
  }

  get totalUsuariosEmpresa(): number {
    return this.users.filter(u => resolveUserKind(u.roles) === 'supervisor').length;
  }

  get totalGestores(): number {
    return this.users.filter(u => resolveUserKind(u.roles) === 'gestor').length;
  }

  get totalTrabajadores(): number {
    return this.users.filter(u => resolveUserKind(u.roles) === 'trabajador').length;
  }

  setUserTypeFilter(type: 'todos' | 'empresa' | 'supervisor' | 'gestor' | 'administrador' | 'trabajador'): void {
    this.userTypeFilter = type;
    this.applyFilter();
  }

  getUserKind(user: User): AdminUserKind {
    return resolveUserKind(user?.roles);
  }

  getUserTypeLabel(user: User): string {
    return userKindLabel(this.getUserKind(user));
  }

  getUserTypeBadgeClass(user: User): string {
    return userKindBadgeClass(this.getUserKind(user));
  }

  formatRole(role: string): string {
    return formatRoleName(role);
  }

  /** Superadmin: no editable/eliminable desde aquí. Trabajador: editable limitado (credenciales), no como “usuario consulta”. */
  canEditUser(user: User): boolean {
    const kind = this.getUserKind(user);
    if (kind === 'superadmin') return false;
    return true;
  }

  canDeleteUser(user: User): boolean {
    const kind = this.getUserKind(user);
    if (kind === 'superadmin') return false;
    if (kind === 'admin_empresa' && this.isCompanyAdmin) return false;
    return true;
  }
  updatePagedUsers(): void {
    // Precargar las imágenes para evitar titileos
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const newPagedUsers = this.filteredUsers.slice(start, end);
    
    // Solo actualizar si hay cambios reales
    if (JSON.stringify(newPagedUsers) !== JSON.stringify(this.pagedUsers)) {
      this.pagedUsers = newPagedUsers;
      this.cdr.markForCheck();
      // Precargar asociaciones de empresa solo para los usuarios visibles
      this.preloadBusinessesForPagedUsers();
    }
  }

  editUser(id: number): void {
    this.router.navigate(['/dashboard/admin/usuarios/editar', id]);
  }
  viewUserDetails(id: number): void {
    this.router.navigate(['/dashboard/admin/usuarios', id]);
  }

  showCarnet(user: User): void {
    const modalRef = this.modalService.open(CarnetDigitalComponent, { 
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.user = user;
  }

  confirmDelete(content: any, user: User): void {
    this.modalService.open(content, { ariaLabelledBy: 'modal-delete-title' }).result.then(
      (result) => {
        if (result === 'confirm') {
          this.deleteUser(user.id, false);
        } else if (result === 'confirm_force') {
          this.deleteUser(user.id, true);
        }
      }
    );
  }
  deleteUser(id: number, force: boolean = false): void {
    this.userService.deleteUser(id, force).subscribe({
      next: () => {
        this.notificationService.success('Usuario eliminado exitosamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al eliminar usuario', error);
        // Si fue un 409 y no es forzado, sugerir forzar
        if (Number(error?.status) === 409 && !force) {
          this.notificationService.error('No se pudo eliminar por relaciones activas. Intenta "Eliminar forzado".');
        }
        const msg = (error?.error && typeof error.error === 'object' && 'message' in error.error)
          ? (error.error as any).message
          : (typeof error?.error === 'string' ? error.error : (error?.message || 'Error desconocido'));
        this.notificationService.error('Error al eliminar el usuario: ' + msg);
        // Recargar usuarios para asegurar consistencia visual
        this.loadUsers();
      }
    });
  }

  toggleUserActive(id: number, event: Event): void {
    event.stopPropagation();
    this.isLoading = true; // Mostramos un indicador de carga
    this.userService.toggleUserActive(id).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.id === id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.applyFilter();
          const estado = updatedUser.active ? 'activado' : 'desactivado';
          this.notificationService.success(`Usuario ${estado} exitosamente`);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cambiar estado del usuario', error);
        this.isLoading = false;
        // Revertir el estado visual del checkbox
        try {
          const input = event.target as HTMLInputElement;
          if (input && typeof input.checked === 'boolean') {
            input.checked = !input.checked;
          }
        } catch {}
        // Mensaje claro desde el backend (ErrorResponse)
        const msg = (error?.error && typeof error.error === 'object' && 'message' in error.error)
          ? (error.error as any).message
          : (typeof error?.error === 'string' ? error.error : (error?.message || 'Error desconocido'));
        this.notificationService.error('Error al cambiar el estado del usuario: ' + msg);
        // Recargar usuarios para asegurar consistencia visual
        this.loadUsers();
      }
    });
  }

  private preloadBusinessesForPagedUsers(): void {
    (this.pagedUsers || []).forEach(u => {
      if (!u || !u.id) return;
      if (!this.userBusinessCache.has(u.id)) {
        this.ensureBusinessLoadedForUser(u.id);
      }
    });
  }

  private ensureBusinessLoadedForUser(userId: number): void {
    if (this.userBusinessLoading.has(userId)) return;
    this.userBusinessLoading.add(userId);
    this.businessService.getByUserId(userId).subscribe({
      next: (list) => {
        const b = Array.isArray(list) && list.length > 0 ? list[0] as any : null;
        const label = b ? `${b.ruc || ''}${b.ruc ? ' - ' : ''}${b.name || b.nameShort || 'Empresa'}` : '—';
        this.userBusinessCache.set(userId, label);
        if (b && b.id != null) this.userBusinessIdMap.set(userId, Number(b.id));
        this.cdr.markForCheck();
      },
      error: () => {
        this.userBusinessCache.set(userId, '—');
        this.cdr.markForCheck();
      }
    }).add(() => {
      this.userBusinessLoading.delete(userId);
    });
  }

  getUserBusinessDisplay(user: User): string {
    if (!user || !user.id) return '—';
    // Si hay una empresa seleccionada, mostrar directamente su nombre
    if (this.selectedBusinessId !== 'all') {
      return this.getCurrentBusinessLabel();
    }
    return this.userBusinessCache.get(user.id) || 'Cargando...';
  }
  
  getBusinessTooltip(user: User): string {
    if (!user || !user.id) return '';
    const bid = this.userBusinessIdMap.get(user.id);
    if (bid == null) return 'Cargando empresa...';
    const b = this.businesses.find(x => Number(x.id) === Number(bid));
    if (!b) return 'Empresa no disponible';
    const parts: string[] = [];
    parts.push(`Empresa: ${b.name || b.nameShort || ''}`.trim());
    if (b.ruc) parts.push(`RUC: ${b.ruc}`);
    if (b.email) parts.push(`Email: ${b.email}`);
    if (b.sector) parts.push(`Sector: ${b.sector}`);
    return parts.join(' | ');
  }

  getCurrentBusinessLabel(): string {
    if (this.selectedBusinessId === 'all') {
      return 'Todas las empresas';
    }
    const targetId = Number(this.selectedBusinessId);
    const b = this.businesses.find(x => x.id != null && Number(x.id) === targetId);
    if (!b) {
      return 'Empresa no disponible';
    }
    const baseName = b.name || b.nameShort || '';
    return `${b.ruc ? b.ruc + ' - ' : ''}${baseName}`.trim();
  }
  getProfilePictureUrl(user: User): string {
    if (!user) return 'assets/img/user-placeholder.svg';
    
    // Si ya tenemos la URL en caché local, la usamos directamente
    if (user.id && this.profileImageUrls.has(user.id)) {
      return this.profileImageUrls.get(user.id) || 'assets/img/user-placeholder.svg';
    }
    
    // Si el usuario tiene una imagen de perfil
    if (user.profilePicture) {
      // Usar el nuevo endpoint específico para imágenes de perfil
      const profileName = user.profilePicture.includes('/') 
        ? user.profilePicture.split('/').pop() 
        : user.profilePicture;
      
      // Usamos una versión basada en la fecha de actualización del usuario en lugar de Date.now()
      // Esto asegura que la URL solo cambie cuando la imagen realmente cambie
      const cacheBuster = user.updatedAt ? new Date(user.updatedAt).getTime() : '';
      const imageUrl = `${environment.apiUrl}/api/files/profiles/${profileName}?v=${cacheBuster}`;
      
      if (user.id) this.profileImageUrls.set(user.id, imageUrl);
      return imageUrl;
    }
    
    return 'assets/img/user-placeholder.svg';
  }
}
