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
  searchText = '';
  userTypeFilter: 'todos' | 'empresa' | 'administrador' = 'empresa';
  // Empresas para filtro
  businesses: Business[] = [];
  selectedBusinessId: number | 'all' = 'all';
  page = 1;
  pageSize = 10;
  environment = environment;  constructor(
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.businesses = [];
      }
    });
  }
  
  ngOnChanges(): void {
    this.updatePagedUsers();
  }

  loadUsers(): void {
    this.isLoading = true;    this.userService.getUsers().subscribe({
      next: (data) => {        this.users = data;
        this.applyFilter(); // Esto también llamará a updatePagedUsers()
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar usuarios', error);
        this.isLoading = false;
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
          this.deleteUser(user.id);
        }
      }
    );
  }
  deleteUser(id: number): void {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.notificationService.success('Usuario eliminado exitosamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al eliminar usuario', error);
        this.notificationService.error('Error al eliminar el usuario: ' + (error.error || error.message || 'Error desconocido'));
      }
    });  }
  
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
        this.notificationService.error('Error al cambiar el estado del usuario: ' + (error.error || error.message || 'Error desconocido'));
      }
    });
  }  // Variable para almacenar las URLs de imágenes de perfil
  private profileImageUrls: Map<number, string> = new Map();
  // Cache de empresa por usuario (muestra "RUC - Nombre")
  private userBusinessCache: Map<number, string> = new Map();
  private userBusinessLoading: Set<number> = new Set();
  private userBusinessIdMap: Map<number, number> = new Map();

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
    if (!user) return 'assets/img/default-avatar.png';
    
    // Si ya tenemos la URL en caché local, la usamos directamente
    if (user.id && this.profileImageUrls.has(user.id)) {
      return this.profileImageUrls.get(user.id) || 'assets/img/default-avatar.png';
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
    
    return '/assets/img/user-placeholder.svg';
  }
}
