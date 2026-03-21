import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';
import { DashboardCumplimientoComponent } from './views/dashboard-cumplimiento/dashboard-cumplimiento.component';
import { AccidentesIncidentesComponent } from './views/accidentes-incidentes/accidentes-incidentes.component';
import { IncidentFormComponent } from './views/accidentes-incidentes/incident-form.component';

const routes: Routes = [
  {
    path: '',
    component: SeguridadIndustrialComponent,
    children: [
      { path: '', redirectTo: 'dashboard-cumplimiento', pathMatch: 'full' },
      { path: 'dashboard-cumplimiento', component: DashboardCumplimientoComponent },
      { path: 'matriz-legal', component: MatrizLegalUsuarioComponent },
      { path: 'accidentes-incidentes', component: AccidentesIncidentesComponent },
      { path: 'accidentes-incidentes/nuevo', component: IncidentFormComponent },
      { path: 'accidentes-incidentes/:id', component: IncidentFormComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadIndustrialRoutingModule {}
