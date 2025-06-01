import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaCargoComponent } from './lista-cargo.component';
import { NuevoCargoComponent } from './nuevo-cargo.component';
import { EditarCargoComponent } from './editar-cargo.component';

const routes: Routes = [
  {
    path: '',
    component: ListaCargoComponent
  },
  {
    path: 'nuevo',
    component: NuevoCargoComponent
  },
  {
    path: 'editar/:id',
    component: EditarCargoComponent
  }
];

@NgModule({
  declarations: [
    ListaCargoComponent,
    NuevoCargoComponent,
    EditarCargoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class CargoModule { } 