import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-usuario-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-welcome.component.html',
  styleUrls: ['./usuario-welcome.component.scss']
})
export class UsuarioWelcomeComponent implements OnInit {
  empresaRuc: string = '';
  empresaNombre: string = '';
  usuario: any = null;
  fechaAcceso: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener fecha actual
    this.fechaAcceso = new Date().toLocaleDateString('es-ES');
    
    // Obtener el RUC de la URL
    this.empresaRuc = this.route.snapshot.params['ruc'];
    
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/usuario-login']);
      return;
    }

    // Obtener información del usuario y empresa
    this.usuario = this.authService.getCurrentUser();
    console.log('Usuario obtenido en welcome:', this.usuario);
    console.log('RUC buscado desde URL:', this.empresaRuc);
    
    // Buscar la empresa con el RUC correspondiente
    if (this.usuario?.businesses && this.usuario.businesses.length > 0) {
      console.log('Empresas disponibles:', this.usuario.businesses);
      const empresaEncontrada = this.usuario.businesses.find((business: any) => business.ruc === this.empresaRuc);
      console.log('Empresa encontrada con RUC', this.empresaRuc, ':', empresaEncontrada);
      
      if (empresaEncontrada) {
        this.empresaNombre = empresaEncontrada.name || empresaEncontrada.businessName || 'Su Empresa';
        console.log('Nombre de empresa asignado:', this.empresaNombre);
      } else {
        console.warn('No se encontró empresa con RUC:', this.empresaRuc);
        console.warn('RUCs disponibles:', this.usuario.businesses.map((b: any) => b.ruc));
        this.empresaNombre = 'Empresa no encontrada';
      }
    } else {
      console.warn('Usuario sin empresas asociadas o businesses es null/undefined');
      console.warn('businesses:', this.usuario?.businesses);
      this.empresaNombre = 'Sin empresa asociada';
    }
  }

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Método para ir al dashboard (si lo implementas después)
  goToDashboard(): void {
    // Por ahora solo muestra un mensaje
    alert('Dashboard en desarrollo. Por el momento solo tienes acceso a esta página de bienvenida.');
  }

  // Método para navegar a los módulos específicos
  goToModule(moduleName: string): void {
    // Mapeo de nombres de módulos
    const moduleNames: { [key: string]: string } = {
      'inventario': 'Inventario',
      'medico': 'Módulo Médico',
      'calidad': 'Control de Calidad',
      'mantenimiento': 'Mantenimiento',
      'medio-ambiente': 'Medio Ambiente',
      'produccion': 'Producción',
      'logistica': 'Logística'
    };

    const moduloNombre = moduleNames[moduleName] || moduleName;
    
    // Ruta implementada: solo inventario
    if (moduleName === 'inventario') {
      this.router.navigate([`/usuario/${this.empresaRuc}/inventario`]);
      return;
    }
    
    // Otros módulos: mensaje temporal
    alert(`Accediendo al módulo: ${moduloNombre}\n\nEste módulo está en desarrollo. Pronto estará disponible para la empresa ${this.empresaNombre}.`);
  }
}
