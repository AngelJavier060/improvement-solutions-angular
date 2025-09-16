import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserAdminService } from './user-admin.service';
import { User } from '../../../../models/user.model';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';
import { BusinessService } from '../../../../services/business.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-detalle-usuario',
  templateUrl: './detalle-usuario.component.html',
  styleUrls: ['./detalle-usuario.component.scss']
})
export class DetalleUsuarioComponent implements OnInit {
  userId: number;
  user: User | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  environment = environment;
  businessLabel: string = '—';
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserAdminService,
    private modalService: NgbModal,
    private notificationService: NotificationService,
    private businessService: BusinessService
  ) {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/dashboard/admin/usuarios']);
      this.userId = 0;
      return;
    }
    this.userId = +idParam;
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading = true;
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        // Cargar empresa asociada si NO es administrador
        const isAdmin = (user.roles || []).includes('ROLE_ADMIN');
        if (!isAdmin) {
          this.businessService.getByUserId(this.userId).subscribe({
            next: (list) => {
              const b: any = Array.isArray(list) && list.length > 0 ? list[0] : null;
              this.businessLabel = b ? `${b.ruc ? b.ruc + ' - ' : ''}${b.name || b.nameShort || 'Empresa'}` : '—';
            },
            error: () => {
              this.businessLabel = '—';
            }
          });
        } else {
          this.businessLabel = '—';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar los datos del usuario', error);
        this.errorMessage = 'No se pudo cargar la información del usuario.';
        this.isLoading = false;
      }
    });
  }
  toggleUserActive(): void {
    this.userService.toggleUserActive(this.userId).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        const estado = updatedUser.active ? 'activado' : 'desactivado';
        this.notificationService.success(`Usuario ${estado} exitosamente`);
      },
      error: (error) => {
        console.error('Error al cambiar estado del usuario', error);
        this.notificationService.error('Error al cambiar el estado del usuario: ' + (error.error || error.message || 'Error desconocido'));
      }
    });
  }

  editUser(): void {
    this.router.navigate(['/dashboard/admin/usuarios/editar', this.userId]);
  }

  confirmDelete(content: any): void {
    this.modalService.open(content, { ariaLabelledBy: 'modal-delete-title' }).result.then(
      (result) => {
        if (result === 'confirm') {
          this.deleteUser();
        }
      }
    );
  }
  deleteUser(): void {
    this.userService.deleteUser(this.userId).subscribe({
      next: () => {
        this.notificationService.success('Usuario eliminado exitosamente');
        this.router.navigate(['/dashboard/admin/usuarios']);
      },
      error: (error) => {
        console.error('Error al eliminar usuario', error);
        this.notificationService.error('Error al eliminar el usuario: ' + (error.error || error.message || 'Error desconocido'));
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/usuarios']);
  }
  getRoleName(role: string): string {
    return role.replace('ROLE_', '');
  }

  getProfilePictureUrl(user: User | null): string {
    if (user && user.profilePicture) {
      // Agrega timestamp para evitar caché y titileo
      return `${environment.apiUrl}/files/${user.profilePicture}?v=${new Date().getTime()}`;
    }
    return '/assets/img/user-placeholder.svg';
  }
}
