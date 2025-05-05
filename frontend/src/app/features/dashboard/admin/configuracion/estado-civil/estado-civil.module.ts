import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEstadoCivilComponent } from './lista-estado-civil.component';
import { NuevoEstadoCivilComponent } from './nuevo-estado-civil.component';
import { EditarEstadoCivilComponent } from './editar-estado-civil.component';

const routes: Routes = [
  {
    path: '',
    component: ListaEstadoCivilComponent
  },
  {
    path: 'nuevo',
    component: NuevoEstadoCivilComponent
  },
  {
    path: 'editar/:id',
    component: EditarEstadoCivilComponent
  }
];

@NgModule({
  declarations: [
    ListaEstadoCivilComponent,
    NuevoEstadoCivilComponent,
    EditarEstadoCivilComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EstadoCivilModule { }