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
  userTypeFilter: 'todos' | 'empresa' | 'administrador' = 'empresa';
  // Empresas para filtro
  businesses: Business[] = [];
  selectedBusinessId: number | 'all' = 'all';
  page = 1;
  pageSize = 10;
  environment = environment;

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
    private businessService: BusinessService
  ) { }
  ngOnInit(): void {
    this.loadUsers();
    this.loadBusinesses();
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
        // limpiar estado de error de empresas si venía de antes
        this.errorBusinessesCode = null;
        this.errorBusinessesMessage = '';
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
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        // limpiar estado de error previo
        this.errorUsersCode = null;
        this.errorUsersMessage = '';
        this.applyFilter(); // Esto también llamará a updatePagedUsers()
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar usuarios', error);
        this.users = [];
        this.filteredUsers = [];
        this.isLoading = false;
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

    // Filtrar por tipo de usuario según roles
    if (this.userTypeFilter === 'empresa') {
      this.filteredUsers = base.filter(u => !(u.roles || []).includes('ROLE_ADMIN'));
    } else if (this.userTypeFilter === 'administrador') {
      this.filteredUsers = base.filter(u => (u.roles || []).includes('ROLE_ADMIN'));
    } else {
      this.filteredUsers = base;
    }

    // Filtrar por empresa seleccionada (solo usuarios de empresa)
    if (this.selectedBusinessId !== 'all') {
      const targetId = Number(this.selectedBusinessId);
      this.filteredUsers = this.filteredUsers.filter(u => {
        const mappedId = u.id ? this.userBusinessIdMap.get(u.id) : undefined;
        // Si aún no está mapeado, intentamos cargar y, de momento, lo dejamos fuera hasta que cargue
        if (mappedId === undefined && u.id) this.ensureBusinessLoadedForUser(u.id);
        return mappedId === targetId;
      });
    }
    this.updatePagedUsers();
  }  // Método para actualizar los usuarios paginados

  // Helpers para UI: contadores por tipo
  get totalUsuarios(): number {
    return this.users.length;
  }

  get totalAdministradores(): number {
    return this.users.filter(u => (u.roles || []).includes('ROLE_ADMIN')).length;
  }

  get totalUsuariosEmpresa(): number {
    return this.users.filter(u => !(u.roles || []).includes('ROLE_ADMIN')).length;
  }

  setUserTypeFilter(type: 'todos' | 'empresa' | 'administrador'): void {
    this.userTypeFilter = type;
    this.applyFilter();
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
      // Solo usuarios de empresa (no admins)
      if ((u.roles || []).includes('ROLE_ADMIN')) {
        // Admin no muestra empresa
        this.userBusinessCache.set(u.id, '—');
        return;
      }
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
    if ((user.roles || []).includes('ROLE_ADMIN')) return '—';
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
