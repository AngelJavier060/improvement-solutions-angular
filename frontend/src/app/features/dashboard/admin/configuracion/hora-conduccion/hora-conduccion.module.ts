import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaHoraConduccionComponent } from './lista-hora-conduccion.component';
import { NuevaHoraConduccionComponent } from './nueva-hora-conduccion.component';
import { EditarHoraConduccionComponent } from './editar-hora-conduccion.component';

const routes: Routes = [
  { path: '', component: ListaHoraConduccionComponent },
  { path: 'nueva', component: NuevaHoraConduccionComponent },
  { path: 'editar/:id', component: EditarHoraConduccionComponent }
];

@NgModule({
  declarations: [
    ListaHoraConduccionComponent,
    NuevaHoraConduccionComponent,
    EditarHoraConduccionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class HoraConduccionModule { }
