import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-calidad-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calidad-layout.component.html',
  styleUrls: ['./calidad-layout.component.scss']
})
export class CalidadLayoutComponent implements OnInit {
  businessRuc: string = '';
  currentUser: any = null;
  activeNav: string = 'dashboard';
  sidebarCollapsed = false;

  navItems = [
    { key: 'dashboard',        icon: 'dashboard',           label: 'Panel de Control',    route: 'dashboard' },
    { key: 'documentos',       icon: 'description',         label: 'Documentos',          route: 'documentos' },
    { key: 'auditorias',       icon: 'assignment_turned_in',label: 'Auditorías',          route: 'auditorias' },
    { key: 'no-conformidades', icon: 'error_outline',       label: 'No Conformidades',    route: 'no-conformidades' },
    { key: 'riesgos',          icon: 'security',            label: 'Registro de Riesgos', route: 'riesgos' },
    { key: 'cumplimiento',     icon: 'verified',            label: 'Cumplimiento',        route: 'cumplimiento' },
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
    this.currentUser = this.authService.getCurrentUser();
    this.updateActiveNav(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.updateActiveNav(e.url));
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private updateActiveNav(url: string): void {
    const found = this.navItems.find(n => url.includes('/calidad/' + n.route));
    this.activeNav = found ? found.key : 'dashboard';
  }

  navigateTo(item: any): void {
    this.activeNav = item.key;
    this.router.navigate(['/usuario', this.businessRuc, 'calidad', item.route]);
  }

  goBack(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }

  logout(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }
}
