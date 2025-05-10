import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

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
      }
    ]
  }
];

@NgModule({
  declarations: [
    ConfiguracionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ConfiguracionModule { }