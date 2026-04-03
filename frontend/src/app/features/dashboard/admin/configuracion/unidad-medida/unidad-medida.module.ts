import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaUnidadMedidaComponent } from './lista-unidad-medida.component';
import { NuevaUnidadMedidaComponent } from './nueva-unidad-medida.component';
import { EditarUnidadMedidaComponent } from './editar-unidad-medida.component';

const routes: Routes = [
  { path: '', component: ListaUnidadMedidaComponent },
  { path: 'nueva', component: NuevaUnidadMedidaComponent },
  { path: 'editar/:id', component: EditarUnidadMedidaComponent }
];

@NgModule({
  declarations: [
    ListaUnidadMedidaComponent,
    NuevaUnidadMedidaComponent,
    EditarUnidadMedidaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class UnidadMedidaModule { }
