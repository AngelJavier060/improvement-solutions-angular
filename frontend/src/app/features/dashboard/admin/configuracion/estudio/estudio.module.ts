import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ListaEstudioComponent } from './lista-estudio.component';
import { NuevoEstudioComponent } from './nuevo-estudio.component';
import { EditarEstudioComponent } from './editar-estudio.component';

const routes: Routes = [
  { path: '', component: ListaEstudioComponent },
  { path: 'nuevo', component: NuevoEstudioComponent },
  { path: 'editar/:id', component: EditarEstudioComponent }
];

@NgModule({
  declarations: [
    ListaEstudioComponent,
    NuevoEstudioComponent,
    EditarEstudioComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EstudioModule { }