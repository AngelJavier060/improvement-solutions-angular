import { Component } from '@angular/core';

@Component({
  selector: 'app-seguridad-industrial',
  template: `
    <div class="d-flex si-root" style="height: 100vh; min-height: 100vh;">
      <app-sidebar-seguridad
        [collapsed]="isCollapsed"
        (collapsedChange)="isCollapsed = $event">
      </app-sidebar-seguridad>
      <!-- min-width:0 permite que el área de contenido no herede el ancho mínimo de tablas anchas y así el scroll-x funcione dentro de la vista -->
      <div class="flex-grow-1 d-flex flex-column si-content-col"
           [style.margin-left.px]="isCollapsed ? 76 : 250"
           style="min-height: 100vh; min-width: 0;">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class SeguridadIndustrialComponent {
  isCollapsed = false;
}
