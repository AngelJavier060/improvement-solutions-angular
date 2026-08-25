import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ListaVisitasWebComponent } from './lista-visitas-web.component';

@NgModule({
  declarations: [ListaVisitasWebComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: ListaVisitasWebComponent }
    ])
  ]
})
export class VisitasWebModule {}
