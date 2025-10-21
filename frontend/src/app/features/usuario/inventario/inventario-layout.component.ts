import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-inventario-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventario-layout.component.html',
  styleUrls: ['./inventario-layout.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class InventarioLayoutComponent implements OnInit {
  ruc: string = '';
  collapsed: boolean = false;
  companyName: string = 'Mi Empresa';

  menuSections: Array<{
    label: string;
    icon: string;
    route?: string;
    type: 'single' | 'group';
    expanded?: boolean;
    items?: Array<{
      label: string;
      icon: string;
      route: string;
      badge?: number;
      badgeColor?: 'danger' | 'warning';
    }>;
  }> = [
    {
      label: 'Dashboard',
      icon: 'fas fa-home',
      route: 'dashboard',
      type: 'single'
    },
    {
      label: 'INVENTARIO',
      icon: 'fas fa-warehouse',
      type: 'group',
      expanded: true,
      items: [
        { label: 'Catálogo de Productos', icon: 'fas fa-book', route: 'catalogo-productos' },
        { label: 'Stock Actual', icon: 'fas fa-boxes', route: 'stock-actual' },
        { label: 'Buscar Producto', icon: 'fas fa-search', route: 'buscar-producto' }
      ]
    },
    {
      label: 'ENTRADAS',
      icon: 'fas fa-arrow-down',
      type: 'group',
      expanded: true,
      items: [
        { label: 'Nueva Entrada', icon: 'fas fa-plus', route: 'nueva-entrada' },
        { label: 'Historial de Entradas', icon: 'fas fa-list', route: 'historial-entradas' }
      ]
    },
    {
      label: 'SALIDAS',
      icon: 'fas fa-arrow-up',
      type: 'group',
      expanded: true,
      items: [
        { label: 'Nueva Salida', icon: 'fas fa-minus', route: 'nueva-salida' },
        { label: 'Historial de Salidas', icon: 'fas fa-list-alt', route: 'historial-salidas' }
      ]
    },
    {
      label: 'GESTIÓN ESPECIAL',
      icon: 'fas fa-cogs',
      type: 'group',
      expanded: false,
      items: [
        { label: 'Cambios/Reemplazos', icon: 'fas fa-exchange-alt', route: 'cambios-reemplazos' },
        { label: 'Devoluciones', icon: 'fas fa-undo', route: 'devoluciones' },
        { label: 'Préstamos', icon: 'fas fa-handshake', route: 'prestamos', badge: 3 },
        { label: 'Ajustes', icon: 'fas fa-sliders-h', route: 'ajustes' }
      ]
    },
    {
      label: 'REPORTES',
      icon: 'fas fa-chart-bar',
      type: 'group',
      expanded: false,
      items: [
        { label: 'General', icon: 'fas fa-chart-line', route: 'reportes-general' },
        { label: 'Kardex', icon: 'fas fa-file-alt', route: 'reportes-kardex' },
        { label: 'Alertas', icon: 'fas fa-exclamation-triangle', route: 'reportes-alertas', badge: 5, badgeColor: 'danger' },
        { label: 'Financiero', icon: 'fas fa-dollar-sign', route: 'reportes-financiero' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.snapshot.params['ruc'] || '';
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  toggleSection(section: any): void {
    if (section.type === 'group') {
      section.expanded = !section.expanded;
    }
  }

  navigateTo(route: string): void {
    const fullRoute = `/usuario/${this.ruc}/inventario/${route}`;
    this.router.navigate([fullRoute]);
  }

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  goBack(): void {
    this.router.navigate([`/usuario/${this.ruc}/welcome`]);
  }
}
