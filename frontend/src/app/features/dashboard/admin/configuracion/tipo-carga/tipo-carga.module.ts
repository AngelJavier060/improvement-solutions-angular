import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoCargaComponent } from './lista-tipo-carga.component';
import { NuevaTipoCargaComponent } from './nueva-tipo-carga.component';
import { EditarTipoCargaComponent } from './editar-tipo-carga.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaTipoCargaComponent },
  { path: 'nuevo', component: NuevaTipoCargaComponent },
  { path: 'editar/:id', component: EditarTipoCargaComponent }
];

@NgModule({
  declarations: [
    ListaTipoCargaComponent,
    NuevaTipoCargaComponent,
    EditarTipoCargaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class TipoCargaModule { }
