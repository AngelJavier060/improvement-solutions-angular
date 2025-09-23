import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


import { SeguridadIndustrialRoutingModule } from './seguridad-industrial.routing';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';
import { DashboardCumplimientoComponent } from './views/dashboard-cumplimiento/dashboard-cumplimiento.component';
import { SidebarSeguridadComponent } from './sidebar-seguridad.component';

@NgModule({
  declarations: [
    SeguridadIndustrialComponent,
    MatrizLegalUsuarioComponent,
    SidebarSeguridadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SeguridadIndustrialRoutingModule,
    DashboardCumplimientoComponent
  ]
})
export class SeguridadIndustrialModule {}
