import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaHorarioCirculacionComponent } from './lista-horario-circulacion.component';
import { NuevaHorarioCirculacionComponent } from './nueva-horario-circulacion.component';
import { EditarHorarioCirculacionComponent } from './editar-horario-circulacion.component';

const routes: Routes = [
  { path: '', component: ListaHorarioCirculacionComponent },
  { path: 'nuevo', component: NuevaHorarioCirculacionComponent },
  { path: 'editar/:id', component: EditarHorarioCirculacionComponent }
];

@NgModule({
  declarations: [
    ListaHorarioCirculacionComponent,
    NuevaHorarioCirculacionComponent,
    EditarHorarioCirculacionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class HorarioCirculacionModule { }
