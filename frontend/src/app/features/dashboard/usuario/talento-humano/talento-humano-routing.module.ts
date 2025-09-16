import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';

const routes: Routes = [
  {
    path: '',
    component: TalentoHumanoComponent,
    children: [
      {
        path: '',
        redirectTo: 'empleados',
        pathMatch: 'full'
      },
      {
        path: 'empleados',
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