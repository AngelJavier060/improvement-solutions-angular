import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  isRootRoute = true;
  username: string = 'Javier'; // Valor por defecto

  constructor(public router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    // Detectar cambios en la ruta para determinar si estamos en la ruta raíz
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isRootRoute = event.url === '/dashboard/admin';
    });
    
    // Establecer valor inicial
    this.isRootRoute = this.router.url === '/dashboard/admin';
    
    // Obtener información del usuario actual
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username = user.name || user.username || 'Javier';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}