import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaClaseVehiculoComponent } from './lista-clase-vehiculo.component';
import { NuevaClaseVehiculoComponent } from './nueva-clase-vehiculo.component';
import { EditarClaseVehiculoComponent } from './editar-clase-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaClaseVehiculoComponent },
  { path: 'nueva', component: NuevaClaseVehiculoComponent },
  { path: 'editar/:id', component: EditarClaseVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaClaseVehiculoComponent,
    NuevaClaseVehiculoComponent,
    EditarClaseVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ClaseVehiculoModule { }
