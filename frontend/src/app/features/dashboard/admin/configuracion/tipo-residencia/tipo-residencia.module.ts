import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoResidenciaComponent } from './lista-tipo-residencia.component';
import { NuevoTipoResidenciaComponent } from './nuevo-tipo-residencia.component';
import { EditarTipoResidenciaComponent } from './editar-tipo-residencia.component';

const routes: Routes = [
  { path: '', component: ListaTipoResidenciaComponent },
  { path: 'nuevo', component: NuevoTipoResidenciaComponent },
  { path: 'editar/:id', component: EditarTipoResidenciaComponent }
];

@NgModule({
  declarations: [
    ListaTipoResidenciaComponent,
    NuevoTipoResidenciaComponent,
    EditarTipoResidenciaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TipoResidenciaModule { }
