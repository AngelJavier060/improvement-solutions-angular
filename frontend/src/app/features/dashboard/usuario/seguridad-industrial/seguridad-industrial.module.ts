import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SeguridadIndustrialRoutingModule } from './seguridad-industrial.routing';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';
import { DashboardCumplimientoComponent } from './views/dashboard-cumplimiento/dashboard-cumplimiento.component';
import { SidebarSeguridadComponent } from './sidebar-seguridad.component';
import { AccidentesIncidentesComponent } from './views/accidentes-incidentes/accidentes-incidentes.component';
import { IncidentFormComponent } from './views/accidentes-incidentes/incident-form.component';
import { IndicadoresReactivosShellComponent } from './views/indicadores-reactivos/indicadores-reactivos-shell.component';
import { ConsolidadoHhttComponent } from './views/indicadores-reactivos/consolidado-hhtt/consolidado-hhtt.component';
import { IndiceFrecuenciaComponent } from './views/indicadores-reactivos/indice-frecuencia/indice-frecuencia.component';
import { IndiceTrifComponent } from './views/indicadores-reactivos/indice-trif/indice-trif.component';
import { IndiceGravedadComponent } from './views/indicadores-reactivos/indice-gravedad/indice-gravedad.component';
import { IndiceRiesgoComponent } from './views/indicadores-reactivos/indice-riesgo/indice-riesgo.component';
import { IndicadoresReactivosDashboardComponent } from './views/indicadores-reactivos/indicadores-reactivos-dashboard.component';

@NgModule({
  declarations: [
    SeguridadIndustrialComponent,
    MatrizLegalUsuarioComponent,
    SidebarSeguridadComponent,
    AccidentesIncidentesComponent,
    IncidentFormComponent,
    IndicadoresReactivosShellComponent,
    IndicadoresReactivosDashboardComponent,
    ConsolidadoHhttComponent,
    IndiceFrecuenciaComponent,
    IndiceTrifComponent,
    IndiceGravedadComponent,
    IndiceRiesgoComponent
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
