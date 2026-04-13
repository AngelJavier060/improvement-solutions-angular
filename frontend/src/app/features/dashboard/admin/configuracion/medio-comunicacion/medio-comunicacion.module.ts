import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaMedioComunicacionComponent } from './lista-medio-comunicacion.component';
import { NuevaMedioComunicacionComponent } from './nueva-medio-comunicacion.component';
import { EditarMedioComunicacionComponent } from './editar-medio-comunicacion.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaMedioComunicacionComponent },
  { path: 'nuevo', component: NuevaMedioComunicacionComponent },
  { path: 'editar/:id', component: EditarMedioComunicacionComponent }
];

@NgModule({
  declarations: [
    ListaMedioComunicacionComponent,
    NuevaMedioComunicacionComponent,
    EditarMedioComunicacionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class MedioComunicacionModule { }
