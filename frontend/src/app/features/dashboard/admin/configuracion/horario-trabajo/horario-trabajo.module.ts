import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ListaHorarioTrabajoComponent } from './lista-horario-trabajo.component';
import { NuevoHorarioTrabajoComponent } from './nuevo-horario-trabajo.component';
import { EditarHorarioTrabajoComponent } from './editar-horario-trabajo.component';

const routes: Routes = [
  { path: '', component: ListaHorarioTrabajoComponent },
  { path: 'nuevo', component: NuevoHorarioTrabajoComponent },
  { path: 'editar/:id', component: EditarHorarioTrabajoComponent }
];

@NgModule({
  declarations: [
    ListaHorarioTrabajoComponent,
    NuevoHorarioTrabajoComponent,
    EditarHorarioTrabajoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class HorarioTrabajoModule {}
