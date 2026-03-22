import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';
import { DashboardCumplimientoComponent } from './views/dashboard-cumplimiento/dashboard-cumplimiento.component';
import { AccidentesIncidentesComponent } from './views/accidentes-incidentes/accidentes-incidentes.component';
import { IncidentFormComponent } from './views/accidentes-incidentes/incident-form.component';
import { IndicadoresReactivosShellComponent } from './views/indicadores-reactivos/indicadores-reactivos-shell.component';
import { ConsolidadoHhttComponent } from './views/indicadores-reactivos/consolidado-hhtt/consolidado-hhtt.component';
import { IndiceFrecuenciaComponent } from './views/indicadores-reactivos/indice-frecuencia/indice-frecuencia.component';
import { IndiceTrifComponent } from './views/indicadores-reactivos/indice-trif/indice-trif.component';
import { IndiceGravedadComponent } from './views/indicadores-reactivos/indice-gravedad/indice-gravedad.component';
import { IndiceRiesgoComponent } from './views/indicadores-reactivos/indice-riesgo/indice-riesgo.component';
import { IndicadoresReactivosDashboardComponent } from './views/indicadores-reactivos/indicadores-reactivos-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: SeguridadIndustrialComponent,
    children: [
      { path: '', redirectTo: 'dashboard-cumplimiento', pathMatch: 'full' },
      { path: 'dashboard-cumplimiento', component: DashboardCumplimientoComponent },
      { path: 'matriz-legal', component: MatrizLegalUsuarioComponent },
      {
        path: 'indicadores-reactivos',
        component: IndicadoresReactivosShellComponent,
        children: [
          { path: '', component: IndicadoresReactivosDashboardComponent },
          { path: 'consolidado-hhtt', component: ConsolidadoHhttComponent },
          { path: 'indice-frecuencia', component: IndiceFrecuenciaComponent },
          { path: 'indice-trif', component: IndiceTrifComponent },
          { path: 'indice-gravedad', component: IndiceGravedadComponent },
          { path: 'indice-riesgo', component: IndiceRiesgoComponent }
        ]
      },
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
