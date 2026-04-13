import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaDistanciaRecorrerComponent } from './lista-distancia-recorrer.component';
import { NuevaDistanciaRecorrerComponent } from './nueva-distancia-recorrer.component';
import { EditarDistanciaRecorrerComponent } from './editar-distancia-recorrer.component';
import { ConfiguracionViajeSharedModule } from '../shared/configuracion-viaje-shared.module';

const routes: Routes = [
  { path: '', component: ListaDistanciaRecorrerComponent },
  { path: 'nueva', component: NuevaDistanciaRecorrerComponent },
  { path: 'editar/:id', component: EditarDistanciaRecorrerComponent }
];

@NgModule({
  declarations: [
    ListaDistanciaRecorrerComponent,
    NuevaDistanciaRecorrerComponent,
    EditarDistanciaRecorrerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ConfiguracionViajeSharedModule
  ]
})
export class DistanciaRecorrerModule { }
