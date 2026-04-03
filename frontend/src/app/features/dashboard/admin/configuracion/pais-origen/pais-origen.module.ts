import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaPaisOrigenComponent } from './lista-pais-origen.component';
import { NuevaPaisOrigenComponent } from './nueva-pais-origen.component';
import { EditarPaisOrigenComponent } from './editar-pais-origen.component';

const routes: Routes = [
  { path: '', component: ListaPaisOrigenComponent },
  { path: 'nuevo', component: NuevaPaisOrigenComponent },
  { path: 'editar/:id', component: EditarPaisOrigenComponent }
];

@NgModule({
  declarations: [
    ListaPaisOrigenComponent,
    NuevaPaisOrigenComponent,
    EditarPaisOrigenComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class PaisOrigenModule { }
