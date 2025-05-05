import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaGeneroComponent } from './lista-genero.component';
import { NuevoGeneroComponent } from './nuevo-genero.component';
import { EditarGeneroComponent } from './editar-genero.component';

const routes: Routes = [
  { path: '', component: ListaGeneroComponent },
  { path: 'nuevo', component: NuevoGeneroComponent },
  { path: 'editar/:id', component: EditarGeneroComponent }
];

@NgModule({
  declarations: [
    ListaGeneroComponent,
    NuevoGeneroComponent,
    EditarGeneroComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class GeneroModule { }