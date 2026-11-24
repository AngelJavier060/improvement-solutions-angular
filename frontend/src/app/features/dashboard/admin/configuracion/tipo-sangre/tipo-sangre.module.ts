import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ListaTipoSangreComponent } from './lista-tipo-sangre.component';

const routes: Routes = [
  { path: '', component: ListaTipoSangreComponent }
];

@NgModule({
  declarations: [ListaTipoSangreComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class TipoSangreModule {}
