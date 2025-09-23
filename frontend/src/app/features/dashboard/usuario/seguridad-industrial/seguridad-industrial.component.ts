import { Component } from '@angular/core';

@Component({
  selector: 'app-seguridad-industrial',
  template: `
    <div class="d-flex" style="height: 100vh; min-height: 100vh;">
      <app-sidebar-seguridad
        [collapsed]="isCollapsed"
        (collapsedChange)="isCollapsed = $event">
      </app-sidebar-seguridad>
      <div class="flex-grow-1 d-flex flex-column"
           [style.margin-left.px]="isCollapsed ? 76 : 250"
           style="min-height: 100vh;">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class SeguridadIndustrialComponent {
  isCollapsed = false;
}
