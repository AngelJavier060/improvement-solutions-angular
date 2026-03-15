import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ListaJornadaTrabajoComponent } from './lista-jornada-trabajo.component';
import { NuevaJornadaTrabajoComponent } from './nueva-jornada-trabajo.component';
import { EditarJornadaTrabajoComponent } from './editar-jornada-trabajo.component';

const routes: Routes = [
  { path: '', component: ListaJornadaTrabajoComponent },
  { path: 'nueva', component: NuevaJornadaTrabajoComponent },
  { path: 'editar/:id', component: EditarJornadaTrabajoComponent }
];

@NgModule({
  declarations: [
    ListaJornadaTrabajoComponent,
    NuevaJornadaTrabajoComponent,
    EditarJornadaTrabajoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class JornadaTrabajoModule {}
