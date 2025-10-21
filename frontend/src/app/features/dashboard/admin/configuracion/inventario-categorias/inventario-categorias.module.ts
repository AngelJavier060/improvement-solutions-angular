import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { InventarioCategoriasComponent } from './inventario-categorias.component';

const routes: Routes = [
  { path: '', component: InventarioCategoriasComponent }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InventarioCategoriasComponent, RouterModule.forChild(routes)]
})
export class InventarioCategoriasModule {}
