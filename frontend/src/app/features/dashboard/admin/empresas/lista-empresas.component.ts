import { Component, OnInit } from '@angular/core';
import { Business } from '../../../../models/business.model';
import { BusinessService } from '../../../../services/business.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-lista-empresas',
  templateUrl: './lista-empresas.component.html',
  styleUrls: ['./lista-empresas.component.scss']
})
export class ListaEmpresasComponent implements OnInit {
  empresas: Business[] = [];
  loading = true;
  error = '';

  constructor(
    private businessService: BusinessService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.loading = true;
    this.error = '';

    if (!this.authService.isLoggedIn()) {
      console.log('Usuario no autenticado, redirigiendo a login');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.businessService.getAll().subscribe({
      next: (data) => {
        this.empresas = data;
        this.loading = false;
      },      error: (error) => {
        console.error('Error al cargar empresas:', error);
        this.loading = false;
        
        // No manejamos el 401 aquí porque ya lo hace el interceptor
        if (error.status === 403) {
          this.error = 'No tienes permisos para acceder a esta sección';
          this.router.navigate(['/dashboard']);
        } else {
          this.error = 'Error al cargar las empresas. Por favor, intente nuevamente.';
        }
      }
    });
  }

  eliminarEmpresa(id: number): void {
    if (confirm('¿Está seguro de eliminar esta empresa?')) {
      this.businessService.delete(id).subscribe({
        next: () => {
          this.empresas = this.empresas.filter(empresa => empresa.id !== id);
        },
        error: (error) => {
          console.error('Error al eliminar empresa:', error);
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else {
            alert('Error al eliminar la empresa. Por favor, intente nuevamente.');
          }
        }
      });
    }
  }
}
