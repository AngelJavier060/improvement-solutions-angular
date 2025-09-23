import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';
import { DashboardCumplimientoComponent } from './views/dashboard-cumplimiento/dashboard-cumplimiento.component';

const routes: Routes = [
  {
    path: '',
    component: SeguridadIndustrialComponent,
    children: [
      { path: '', redirectTo: 'dashboard-cumplimiento', pathMatch: 'full' },
      { path: 'dashboard-cumplimiento', component: DashboardCumplimientoComponent },
      { path: 'matriz-legal', component: MatrizLegalUsuarioComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadIndustrialRoutingModule {}
