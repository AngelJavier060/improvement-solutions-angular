import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEmpresasContratistasComponent } from './lista-empresas-contratistas.component';
import { NuevaEmpresaContratistaComponent } from './nueva-empresa-contratista.component';
import { EditarEmpresaContratistaComponent } from './editar-empresa-contratista.component';
import { GestionarBloquesComponent } from './gestionar-bloques.component';

const routes: Routes = [
  { path: '', component: ListaEmpresasContratistasComponent },
  { path: 'nueva', component: NuevaEmpresaContratistaComponent },
  { path: 'editar/:id', component: EditarEmpresaContratistaComponent },
  { path: ':id/bloques', component: GestionarBloquesComponent }
];

@NgModule({
  declarations: [
    ListaEmpresasContratistasComponent,
    NuevaEmpresaContratistaComponent,
    EditarEmpresaContratistaComponent,
    GestionarBloquesComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EmpresasContratistasModule { }