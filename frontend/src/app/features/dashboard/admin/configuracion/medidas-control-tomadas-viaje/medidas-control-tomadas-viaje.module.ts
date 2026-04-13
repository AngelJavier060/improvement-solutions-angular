import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaMedidasControlTomadasViajeComponent } from './lista-medidas-control-tomadas-viaje.component';
import { NuevaMedidasControlTomadasViajeComponent } from './nueva-medidas-control-tomadas-viaje.component';
import { EditarMedidasControlTomadasViajeComponent } from './editar-medidas-control-tomadas-viaje.component';

const routes: Routes = [
  { path: '', component: ListaMedidasControlTomadasViajeComponent },
  { path: 'nuevo', component: NuevaMedidasControlTomadasViajeComponent },
  { path: 'editar/:id', component: EditarMedidasControlTomadasViajeComponent }
];

@NgModule({
  declarations: [
    ListaMedidasControlTomadasViajeComponent,
    NuevaMedidasControlTomadasViajeComponent,
    EditarMedidasControlTomadasViajeComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)]
})
export class MedidasControlTomadasViajeModule {}
