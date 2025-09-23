import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';
import { EmployeeDetailComponent } from './components/employee-detail.component';
import { DocumentsCertificationsComponent } from './components/documents-certifications.component';

import { TalentoHumanoDashboardComponent } from './talento-humano-dashboard.component';

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
      // Ruta para cargar empleados por RUC de la empresa (multi-empresa)
      {
        path: ':businessRuc',
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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TalentoHumanoRoutingModule { }