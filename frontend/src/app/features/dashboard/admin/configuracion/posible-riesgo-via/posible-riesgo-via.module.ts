import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaPosibleRiesgoViaComponent } from './lista-posible-riesgo-via.component';
import { NuevaPosibleRiesgoViaComponent } from './nueva-posible-riesgo-via.component';
import { EditarPosibleRiesgoViaComponent } from './editar-posible-riesgo-via.component';
const routes: Routes = [
  { path: '', component: ListaPosibleRiesgoViaComponent },
  { path: 'nuevo', component: NuevaPosibleRiesgoViaComponent },
  { path: 'editar/:id', component: EditarPosibleRiesgoViaComponent }
];

@NgModule({
  declarations: [
    ListaPosibleRiesgoViaComponent,
    NuevaPosibleRiesgoViaComponent,
    EditarPosibleRiesgoViaComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)]
})
export class PosibleRiesgoViaModule {}
