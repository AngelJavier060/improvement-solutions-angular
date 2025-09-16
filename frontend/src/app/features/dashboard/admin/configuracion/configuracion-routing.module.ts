import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracionComponent } from './configuracion.component';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionComponent,
    children: [
      {
        path: 'genero',
        loadChildren: () => import('./genero/genero.module').then(m => m.GeneroModule)
      },
      {
        path: 'estudio',
        loadChildren: () => import('./estudio/estudio.module').then(m => m.EstudioModule)
      },
      {
        path: 'estado-civil',
        loadChildren: () => import('./estado-civil/estado-civil.module').then(m => m.EstadoCivilModule)
      },
      {
        path: 'tipo-residencia',
        loadChildren: () => import('./tipo-residencia/tipo-residencia.module').then(m => m.TipoResidenciaModule)
      },
      {
        path: 'etnias',
        loadChildren: () => import('./etnias/etnias.module').then(m => m.EtniasModule)
      },
      {
        path: 'tipo-documento',
        loadChildren: () => import('./tipo-documento/tipo-documento.module').then(m => m.TipoDocumentoModule)
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./departamento/departamento.module').then(m => m.DepartamentoModule)
      },      {
        path: 'cargos',
        loadChildren: () => import('./cargo/cargo.module').then(m => m.CargoModule)
      },
      {
        path: 'iess',
        loadChildren: () => import('./iess/iess.module').then(m => m.IessModule)
      },
      {
        path: 'tipo-contrato',
        loadChildren: () => import('./tipo-contrato/tipo-contrato.module').then(m => m.TipoContratoModule)
      },
      {
        path: 'matriz-legal',
        loadChildren: () => import('./matriz-legal/matriz-legal.module').then(m => m.MatrizLegalModule)
      },
      {
        path: 'empresas-contratistas',
        loadChildren: () => import('./empresas-contratistas/empresas-contratistas.module').then(m => m.EmpresasContratistasModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionRoutingModule { }
