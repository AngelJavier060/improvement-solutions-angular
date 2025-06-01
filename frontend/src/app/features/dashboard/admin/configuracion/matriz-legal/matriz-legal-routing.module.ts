import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaMatrizLegalComponent } from './lista-matriz-legal.component';
import { NuevaMatrizLegalComponent } from './nueva-matriz-legal.component';
import { EditarMatrizLegalComponent } from './editar-matriz-legal.component';

const routes: Routes = [
  { path: '', component: ListaMatrizLegalComponent },
  { path: 'nuevo', component: NuevaMatrizLegalComponent },
  { path: 'editar/:id', component: EditarMatrizLegalComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MatrizLegalRoutingModule {}