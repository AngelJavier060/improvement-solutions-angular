import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaCursosCertificacionesComponent } from './lista-cursos-certificaciones.component';
import { NuevoCursosCertificacionesComponent } from './nuevo-cursos-certificaciones.component';
import { EditarCursosCertificacionesComponent } from './editar-cursos-certificaciones.component';

const routes: Routes = [
  { path: '', component: ListaCursosCertificacionesComponent },
  { path: 'nuevo', component: NuevoCursosCertificacionesComponent },
  { path: 'editar/:id', component: EditarCursosCertificacionesComponent }
];

@NgModule({
  declarations: [
    ListaCursosCertificacionesComponent,
    NuevoCursosCertificacionesComponent,
    EditarCursosCertificacionesComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class CursosCertificacionesModule {}
