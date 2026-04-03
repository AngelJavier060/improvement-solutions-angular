import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ListaMetodologiaComponent } from './lista-metodologia.component';
import { NuevaMetodologiaComponent } from './nueva-metodologia.component';
import { EditarMetodologiaComponent } from './editar-metodologia.component';

const routes: Routes = [
  { path: '', component: ListaMetodologiaComponent },
  { path: 'nueva', component: NuevaMetodologiaComponent },
  { path: 'editar/:id', component: EditarMetodologiaComponent }
];

@NgModule({
  declarations: [
    ListaMetodologiaComponent,
    NuevaMetodologiaComponent,
    EditarMetodologiaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class AceptacionRiesgoModule { }
