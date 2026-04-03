import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaPropietarioVehiculoComponent } from './lista-propietario-vehiculo.component';
import { NuevaPropietarioVehiculoComponent } from './nueva-propietario-vehiculo.component';
import { EditarPropietarioVehiculoComponent } from './editar-propietario-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaPropietarioVehiculoComponent },
  { path: 'nuevo', component: NuevaPropietarioVehiculoComponent },
  { path: 'editar/:id', component: EditarPropietarioVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaPropietarioVehiculoComponent,
    NuevaPropietarioVehiculoComponent,
    EditarPropietarioVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class PropietarioVehiculoModule { }
