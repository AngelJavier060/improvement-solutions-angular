import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaCondicionClimaticaComponent } from './lista-condicion-climatica.component';
import { NuevaCondicionClimaticaComponent } from './nueva-condicion-climatica.component';
import { EditarCondicionClimaticaComponent } from './editar-condicion-climatica.component';

const routes: Routes = [
  { path: '', component: ListaCondicionClimaticaComponent },
  { path: 'nueva', component: NuevaCondicionClimaticaComponent },
  { path: 'editar/:id', component: EditarCondicionClimaticaComponent }
];

@NgModule({
  declarations: [
    ListaCondicionClimaticaComponent,
    NuevaCondicionClimaticaComponent,
    EditarCondicionClimaticaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class CondicionClimaticaModule { }
