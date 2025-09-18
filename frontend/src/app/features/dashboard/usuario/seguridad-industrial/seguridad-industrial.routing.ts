import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';

const routes: Routes = [
  {
    path: '',
    component: SeguridadIndustrialComponent,
    children: [
      { path: '', redirectTo: 'matriz-legal', pathMatch: 'full' },
      { path: 'matriz-legal', component: MatrizLegalUsuarioComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadIndustrialRoutingModule {}
