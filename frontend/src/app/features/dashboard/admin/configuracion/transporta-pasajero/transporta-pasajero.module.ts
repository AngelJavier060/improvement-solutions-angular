import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTransportaPasajeroComponent } from './lista-transporta-pasajero.component';
import { NuevaTransportaPasajeroComponent } from './nueva-transporta-pasajero.component';
import { EditarTransportaPasajeroComponent } from './editar-transporta-pasajero.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaTransportaPasajeroComponent },
  { path: 'nuevo', component: NuevaTransportaPasajeroComponent },
  { path: 'editar/:id', component: EditarTransportaPasajeroComponent }
];

@NgModule({
  declarations: [
    ListaTransportaPasajeroComponent,
    NuevaTransportaPasajeroComponent,
    EditarTransportaPasajeroComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class TransportaPasajeroModule { }
