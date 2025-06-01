import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaDepartamentoComponent } from './lista-departamento.component';
import { NuevoDepartamentoComponent } from './nuevo-departamento.component';
import { EditarDepartamentoComponent } from './editar-departamento.component';

const routes: Routes = [
  { path: '', component: ListaDepartamentoComponent },
  { path: 'nuevo', component: NuevoDepartamentoComponent },
  { path: 'editar/:id', component: EditarDepartamentoComponent }
];

@NgModule({
  declarations: [
    ListaDepartamentoComponent,
    NuevoDepartamentoComponent,
    EditarDepartamentoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class DepartamentoModule { } 