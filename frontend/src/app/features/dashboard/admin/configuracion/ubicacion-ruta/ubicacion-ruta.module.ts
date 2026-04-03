import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaUbicacionRutaComponent } from './lista-ubicacion-ruta.component';
import { NuevaUbicacionRutaComponent } from './nueva-ubicacion-ruta.component';
import { EditarUbicacionRutaComponent } from './editar-ubicacion-ruta.component';

const routes: Routes = [
  { path: '', component: ListaUbicacionRutaComponent },
  { path: 'nueva', component: NuevaUbicacionRutaComponent },
  { path: 'editar/:id', component: EditarUbicacionRutaComponent }
];

@NgModule({
  declarations: [
    ListaUbicacionRutaComponent,
    NuevaUbicacionRutaComponent,
    EditarUbicacionRutaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class UbicacionRutaModule { }
