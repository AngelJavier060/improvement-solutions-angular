import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar-seguridad',
  templateUrl: './sidebar-seguridad.component.html',
  styleUrls: ['./sidebar-seguridad.component.scss']
})
export class SidebarSeguridadComponent {
  // Recibe estado de colapso desde el contenedor
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }
}
