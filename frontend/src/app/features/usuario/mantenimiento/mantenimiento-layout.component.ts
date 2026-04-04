import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mantenimiento-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mantenimiento-layout.component.html',
  styleUrls: ['./mantenimiento-layout.component.scss']
})
export class MantenimientoLayoutComponent implements OnInit {
  businessRuc: string = '';
  currentUser: any = null;

  menuItems = [
    { icon: 'tachometer-alt', label: 'Dashboard', route: 'dashboard' },
    { icon: 'truck', label: 'Flota', route: '' },
    { icon: 'file-alt', label: 'Documentación', route: 'documentacion' },
    { icon: 'wrench', label: 'Mantenimiento', route: 'mantenimiento-programado' },
    { icon: 'chart-bar', label: 'Reportes', route: 'reportes' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.businessRuc = params['ruc'];
    });
    
    // Obtener usuario autenticado
    this.currentUser = this.authService.getCurrentUser();
  }

  navigateTo(route: string): void {
    if (route) {
      this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', route]);
    }
  }

  goBack(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }

  logout(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }
}
