import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaNumeroEjeComponent } from './lista-numero-eje.component';
import { NuevaNumeroEjeComponent } from './nueva-numero-eje.component';
import { EditarNumeroEjeComponent } from './editar-numero-eje.component';

const routes: Routes = [
  { path: '', component: ListaNumeroEjeComponent },
  { path: 'nueva', component: NuevaNumeroEjeComponent },
  { path: 'editar/:id', component: EditarNumeroEjeComponent }
];

@NgModule({
  declarations: [
    ListaNumeroEjeComponent,
    NuevaNumeroEjeComponent,
    EditarNumeroEjeComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class NumeroEjeModule { }
