import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEntidadRemitenteComponent } from './lista-entidad-remitente.component';
import { NuevaEntidadRemitenteComponent } from './nueva-entidad-remitente.component';
import { EditarEntidadRemitenteComponent } from './editar-entidad-remitente.component';

const routes: Routes = [
  { path: '', component: ListaEntidadRemitenteComponent },
  { path: 'nueva', component: NuevaEntidadRemitenteComponent },
  { path: 'editar/:id', component: EditarEntidadRemitenteComponent }
];

@NgModule({
  declarations: [
    ListaEntidadRemitenteComponent,
    NuevaEntidadRemitenteComponent,
    EditarEntidadRemitenteComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EntidadRemitenteModule { }
