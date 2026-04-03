import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaMarcaVehiculoComponent } from './lista-marca-vehiculo.component';
import { NuevaMarcaVehiculoComponent } from './nueva-marca-vehiculo.component';
import { EditarMarcaVehiculoComponent } from './editar-marca-vehiculo.component';

const routes: Routes = [
  { path: '', component: ListaMarcaVehiculoComponent },
  { path: 'nueva', component: NuevaMarcaVehiculoComponent },
  { path: 'editar/:id', component: EditarMarcaVehiculoComponent }
];

@NgModule({
  declarations: [
    ListaMarcaVehiculoComponent,
    NuevaMarcaVehiculoComponent,
    EditarMarcaVehiculoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class MarcaVehiculoModule { }
