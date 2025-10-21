import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { InventarioProveedoresComponent } from './inventario-proveedores.component';

const routes: Routes = [
  { path: '', component: InventarioProveedoresComponent }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InventarioProveedoresComponent, RouterModule.forChild(routes)]
})
export class InventarioProveedoresModule {}
