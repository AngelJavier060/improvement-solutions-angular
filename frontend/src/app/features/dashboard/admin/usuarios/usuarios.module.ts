import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

import { ListaUsuariosComponent } from './lista-usuarios.component';
import { EditarUsuarioComponent } from './editar-usuario.component';
import { DetalleUsuarioComponent } from './detalle-usuario.component';
import { SharedModule } from '../../../../shared/shared.module';

const routes: Routes = [
  { path: '', component: ListaUsuariosComponent },
  { path: 'nuevo', component: EditarUsuarioComponent },
  { path: 'editar/:id', component: EditarUsuarioComponent },
  { path: ':id', component: DetalleUsuarioComponent }
];

@NgModule({
  declarations: [
    ListaUsuariosComponent,
    EditarUsuarioComponent,
    DetalleUsuarioComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbPaginationModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class UsuariosModule { }
