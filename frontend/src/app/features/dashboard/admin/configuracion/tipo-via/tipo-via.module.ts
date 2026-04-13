import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoViaComponent } from './lista-tipo-via.component';
import { NuevaTipoViaComponent } from './nueva-tipo-via.component';
import { EditarTipoViaComponent } from './editar-tipo-via.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaTipoViaComponent },
  { path: 'nuevo', component: NuevaTipoViaComponent },
  { path: 'editar/:id', component: EditarTipoViaComponent }
];

@NgModule({
  declarations: [
    ListaTipoViaComponent,
    NuevaTipoViaComponent,
    EditarTipoViaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class TipoViaModule { }
