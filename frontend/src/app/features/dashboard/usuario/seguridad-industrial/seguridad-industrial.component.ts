import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-seguridad-industrial',
  template: `
    <div class="d-flex si-root" style="height: 100vh; min-height: 100vh;">
      <app-sidebar-seguridad
        [collapsed]="isCollapsed"
        (collapsedChange)="isCollapsed = $event">
      </app-sidebar-seguridad>
      <div class="flex-grow-1 d-flex flex-column si-content-col"
           [style.margin-left.px]="isCollapsed ? 76 : 250"
           style="min-height: 100vh; min-width: 0;">
        <div class="alert alert-info m-3 mb-0 py-2 small" *ngIf="isConsulta" role="status">
          <i class="fas fa-eye me-1"></i>
          Modo <strong>solo consulta</strong>: puedes ver la información, pero no crear, editar ni eliminar.
        </div>
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class SeguridadIndustrialComponent implements OnInit {
  isCollapsed = false;
  isConsulta = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.isConsulta = this.authService.isConsultaUser();
  }
}
