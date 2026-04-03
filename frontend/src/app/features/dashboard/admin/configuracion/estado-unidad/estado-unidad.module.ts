import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEstadoUnidadComponent } from './lista-estado-unidad.component';
import { NuevaEstadoUnidadComponent } from './nueva-estado-unidad.component';
import { EditarEstadoUnidadComponent } from './editar-estado-unidad.component';

const routes: Routes = [
  { path: '', component: ListaEstadoUnidadComponent },
  { path: 'nuevo', component: NuevaEstadoUnidadComponent },
  { path: 'editar/:id', component: EditarEstadoUnidadComponent }
];

@NgModule({
  declarations: [
    ListaEstadoUnidadComponent,
    NuevaEstadoUnidadComponent,
    EditarEstadoUnidadComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EstadoUnidadModule { }
