import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaOtrosPeligrosViajeComponent } from './lista-otros-peligros-viaje.component';
import { NuevaOtrosPeligrosViajeComponent } from './nueva-otros-peligros-viaje.component';
import { EditarOtrosPeligrosViajeComponent } from './editar-otros-peligros-viaje.component';

const routes: Routes = [
  { path: '', component: ListaOtrosPeligrosViajeComponent },
  { path: 'nuevo', component: NuevaOtrosPeligrosViajeComponent },
  { path: 'editar/:id', component: EditarOtrosPeligrosViajeComponent }
];

@NgModule({
  declarations: [ListaOtrosPeligrosViajeComponent, NuevaOtrosPeligrosViajeComponent, EditarOtrosPeligrosViajeComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)]
})
export class OtrosPeligrosViajeModule {}
