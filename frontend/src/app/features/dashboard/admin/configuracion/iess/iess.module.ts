import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaIessComponent } from './lista-iess.component';
import { NuevoIessComponent } from './nuevo-iess.component';
import { EditarIessComponent } from './editar-iess.component';

const routes: Routes = [
  {
    path: '',
    component: ListaIessComponent
  },
  {
    path: 'nuevo',
    component: NuevoIessComponent
  },
  {
    path: 'editar/:id',
    component: EditarIessComponent
  }
];

@NgModule({
  declarations: [
    ListaIessComponent,
    NuevoIessComponent,
    EditarIessComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class IessModule { }
