import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEstadoCarreteraComponent } from './lista-estado-carretera.component';
import { NuevaEstadoCarreteraComponent } from './nueva-estado-carretera.component';
import { EditarEstadoCarreteraComponent } from './editar-estado-carretera.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaEstadoCarreteraComponent },
  { path: 'nuevo', component: NuevaEstadoCarreteraComponent },
  { path: 'editar/:id', component: EditarEstadoCarreteraComponent }
];

@NgModule({
  declarations: [
    ListaEstadoCarreteraComponent,
    NuevaEstadoCarreteraComponent,
    EditarEstadoCarreteraComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class EstadoCarreteraModule { }
