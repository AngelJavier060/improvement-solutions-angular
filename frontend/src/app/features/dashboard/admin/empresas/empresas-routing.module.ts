import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaEmpresasComponent } from './lista-empresas.component';
import { NuevaEmpresaComponent } from './nueva-empresa.component';
import { EditarEmpresaComponent } from './editar-empresa.component';
import { DetalleEmpresaComponent } from './detalle-empresa.component';

const routes: Routes = [
  { path: '', component: ListaEmpresasComponent },
  { path: 'nuevo', component: NuevaEmpresaComponent },
  { path: 'editar/:id', component: EditarEmpresaComponent },
  { path: 'detalle/:id', component: DetalleEmpresaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmpresasRoutingModule { }
