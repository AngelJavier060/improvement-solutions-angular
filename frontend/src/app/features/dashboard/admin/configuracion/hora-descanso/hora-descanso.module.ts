import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaHoraDescansoComponent } from './lista-hora-descanso.component';
import { NuevaHoraDescansoComponent } from './nueva-hora-descanso.component';
import { EditarHoraDescansoComponent } from './editar-hora-descanso.component';

const routes: Routes = [
  { path: '', component: ListaHoraDescansoComponent },
  { path: 'nueva', component: NuevaHoraDescansoComponent },
  { path: 'editar/:id', component: EditarHoraDescansoComponent }
];

@NgModule({
  declarations: [
    ListaHoraDescansoComponent,
    NuevaHoraDescansoComponent,
    EditarHoraDescansoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class HoraDescansoModule { }
