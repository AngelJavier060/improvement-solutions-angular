import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTarjetasComponent } from './lista-tarjetas.component';
import { NuevoTarjetasComponent } from './nuevo-tarjetas.component';
import { EditarTarjetasComponent } from './editar-tarjetas.component';

const routes: Routes = [
  { path: '', component: ListaTarjetasComponent },
  { path: 'nuevo', component: NuevoTarjetasComponent },
  { path: 'editar/:id', component: EditarTarjetasComponent }
];

@NgModule({
  declarations: [
    ListaTarjetasComponent,
    NuevoTarjetasComponent,
    EditarTarjetasComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TarjetasModule {}
