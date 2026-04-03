import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoVehiculoComponent } from './lista-tipo-vehiculo.component';
import { NuevaTipoVehiculoComponent } from './nueva-tipo-vehiculo.component';
import { EditarTipoVehiculoComponent } from './editar-tipo-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaTipoVehiculoComponent },
  { path: 'nuevo', component: NuevaTipoVehiculoComponent },
  { path: 'editar/:id', component: EditarTipoVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaTipoVehiculoComponent,
    NuevaTipoVehiculoComponent,
    EditarTipoVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TipoVehiculoModule { }
