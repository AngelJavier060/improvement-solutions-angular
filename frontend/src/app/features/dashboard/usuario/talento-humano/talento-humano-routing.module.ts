import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';
import { EmployeeDetailComponent } from './components/employee-detail.component';
import { DocumentsCertificationsComponent } from './components/documents-certifications.component';

import { TalentoHumanoDashboardComponent } from './talento-humano-dashboard.component';
import { PlanillaMensualComponent } from './components/planilla-mensual.component';
import { HorasExtraComponent } from './components/horas-extra.component';
import { VacacionesComponent } from './components/vacaciones.component';
import { PermisosComponent } from './components/permisos.component';
import { AccidentesComponent } from './components/accidentes.component';

const routes: Routes = [
  {
    path: '',
    component: TalentoHumanoComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      },
      {
        path: 'inicio',
        component: TalentoHumanoDashboardComponent
      },
      {
        path: 'dashboard',
        component: TalentoHumanoDashboardComponent
      },
      // Listado principal de empleados para la empresa del contexto (RUC tomado del padre :ruc)
      {
        path: 'gestion-empleados',
        component: GestionEmpleadosComponent
      },
      // Ruta alternativa para cargar por ID de empresa
      {
        path: 'by-id/:businessId',
        component: GestionEmpleadosComponent
      },
      // Ruta para detalle de empleado
      {
        path: 'employee/:cedula',
        component: EmployeeDetailComponent
      },
      // Ruta para documentos y certificaciones
      {
        path: 'documentos-certificaciones',
        component: DocumentsCertificationsComponent
      },
      // ── Módulos de Control de Asistencia ──
      {
        path: 'planilla-mensual',
        component: PlanillaMensualComponent
      },
      {
        path: 'horas-extra',
        component: HorasExtraComponent
      },
      {
        path: 'vacaciones',
        component: VacacionesComponent
      },
      {
        path: 'permisos',
        component: PermisosComponent
      },
      {
        path: 'accidentes',
        component: AccidentesComponent
      },
      // Ruta wildcard al final: cargar empleados por RUC de empresa (debe ir ÚLTIMA)
      {
        path: ':businessRuc',
        component: GestionEmpleadosComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TalentoHumanoRoutingModule { }