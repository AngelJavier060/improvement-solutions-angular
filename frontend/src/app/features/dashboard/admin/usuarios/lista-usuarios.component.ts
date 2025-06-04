import { Component, OnInit, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserAdminService } from './user-admin.service';
import { User } from '../../../../models/user.model';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';
import { ImageCacheService } from '../../../../services/image-cache.service';

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
  page = 1;
  pageSize = 10;
  environment = environment;  constructor(
    private userService: UserAdminService,
    private modalService: NgbModal,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private imageCacheService: ImageCacheService
  ) { }
  ngOnInit(): void {
    this.loadUsers();
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
    if (this.searchText.trim() === '') {
      this.filteredUsers = [...this.users];
    } else {
      const searchLower = this.searchText.toLowerCase().trim();
      this.filteredUsers = this.users.filter(user =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    this.updatePagedUsers();
  }  // Método para actualizar los usuarios paginados
  updatePagedUsers(): void {
    // Precargar las imágenes para evitar titileos
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const newPagedUsers = this.filteredUsers.slice(start, end);
    
    // Solo actualizar si hay cambios reales
    if (JSON.stringify(newPagedUsers) !== JSON.stringify(this.pagedUsers)) {
      this.pagedUsers = newPagedUsers;
      this.cdr.markForCheck();
    }
  }

  editUser(id: number): void {
    this.router.navigate(['/dashboard/admin/usuarios/editar', id]);
  }

  viewUserDetails(id: number): void {
    this.router.navigate(['/dashboard/admin/usuarios', id]);
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
    
    return 'assets/img/default-avatar.png';
  }
}
