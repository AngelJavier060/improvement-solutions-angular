import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaEmpresasComponent } from './lista-empresas.component';
import { NuevaEmpresaComponent } from './nueva-empresa.component';
import { EditarEmpresaComponent } from './editar-empresa.component';
import { DetalleEmpresaComponent } from './detalle-empresa.component';
import { DetalleEmpresaAdminComponent } from './detalle-empresa-admin.component';
import { DashboardEmpresasComponent } from './dashboard-empresas.component';
import { ApprovalsListComponent } from './approvals-list.component';
import { MatrixConfigComponent } from './matrix-config.component';
import { DiagnosticoBdComponent } from './diagnostico-bd.component';

const routes: Routes = [
  { path: '', component: ListaEmpresasComponent },
  { path: 'nueva', component: NuevaEmpresaComponent },
  { path: 'editar/:id', component: EditarEmpresaComponent },
  { path: 'detalle/:id', component: DetalleEmpresaComponent },
  { path: 'admin/:id', component: DetalleEmpresaAdminComponent },
  { path: 'dashboard', component: DashboardEmpresasComponent },
  { path: 'aprobaciones/:id', component: ApprovalsListComponent },
  { path: 'configuracion-matriz/:id', component: MatrixConfigComponent },
  { path: 'diagnostico', component: DiagnosticoBdComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmpresasRoutingModule { }
