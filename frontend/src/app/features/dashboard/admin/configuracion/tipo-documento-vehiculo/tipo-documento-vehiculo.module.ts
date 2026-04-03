import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoDocumentoVehiculoComponent } from './lista-tipo-documento-vehiculo.component';
import { NuevaTipoDocumentoVehiculoComponent } from './nueva-tipo-documento-vehiculo.component';
import { EditarTipoDocumentoVehiculoComponent } from './editar-tipo-documento-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaTipoDocumentoVehiculoComponent },
  { path: 'nuevo', component: NuevaTipoDocumentoVehiculoComponent },
  { path: 'editar/:id', component: EditarTipoDocumentoVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaTipoDocumentoVehiculoComponent,
    NuevaTipoDocumentoVehiculoComponent,
    EditarTipoDocumentoVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TipoDocumentoVehiculoModule { }
