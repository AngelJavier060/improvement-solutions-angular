import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';

import { TalentoHumanoDashboardComponent } from './talento-humano-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: TalentoHumanoComponent,
    children: [
      {
        path: '',
        component: GestionEmpleadosComponent
      },
      {
        path: 'dashboard',
        component: TalentoHumanoDashboardComponent
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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TalentoHumanoRoutingModule { }