import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaColorVehiculoComponent } from './lista-color-vehiculo.component';
import { NuevaColorVehiculoComponent } from './nueva-color-vehiculo.component';
import { EditarColorVehiculoComponent } from './editar-color-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaColorVehiculoComponent },
  { path: 'nuevo', component: NuevaColorVehiculoComponent },
  { path: 'editar/:id', component: EditarColorVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaColorVehiculoComponent,
    NuevaColorVehiculoComponent,
    EditarColorVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ColorVehiculoModule { }
